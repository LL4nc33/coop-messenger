package server

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"heckel.io/ntfy/v2/log"
	"heckel.io/ntfy/v2/user"
	"io"
	"net/http"
	"strings"
)

const tagDM = "dm"

// generateDMTopicID creates a random DM topic ID like "dm_a3f7b2c4e1d9f6a8"
func generateDMTopicID() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return "dm_" + hex.EncodeToString(b), nil
}

// isDMTopic checks if a topic name is a DM topic
func isDMTopic(topic string) bool {
	return strings.HasPrefix(topic, "dm_")
}

type apiDMCreateRequest struct {
	Username string `json:"username"`
}

type apiDMCreateResponse struct {
	Topic       string `json:"topic"`
	DisplayName string `json:"display_name,omitempty"`
}

type apiDMListEntry struct {
	Topic       string `json:"topic"`
	Partner     string `json:"partner"`
	DisplayName string `json:"display_name,omitempty"`
	AvatarURL   string `json:"avatar_url,omitempty"`
	LastSeen    int64  `json:"last_seen,omitempty"`
}

// handleDMCreate handles POST /v1/coop/dm - start or open a DM
func (s *Server) handleDMCreate(w http.ResponseWriter, r *http.Request, v *visitor) error {
	u := v.User()
	body, err := io.ReadAll(io.LimitReader(r.Body, 4096))
	if err != nil {
		return err
	}
	var req apiDMCreateRequest
	if err := json.Unmarshal(body, &req); err != nil {
		return errHTTPBadRequest.Wrap("invalid request body")
	}
	if req.Username == "" || req.Username == u.Name {
		return errHTTPBadRequest.Wrap("invalid username")
	}

	// Check if target user exists
	if _, err := s.userManager.User(req.Username); err != nil {
		return errHTTPBadRequest.Wrap("user not found")
	}

	// Check if blocked
	blocked, err := s.userManager.IsBlocked(u.Name, req.Username)
	if err != nil {
		return err
	}
	if blocked {
		return errHTTPForbidden.Wrap("blocked")
	}

	// Check contact status or privacy
	contactStatus, err := s.userManager.ContactStatus(u.Name, req.Username)
	if err != nil {
		return err
	}

	if contactStatus != user.ContactStatusAccepted {
		// Check if target has open privacy
		privacy, err := s.userManager.ProfilePrivacy(req.Username)
		if err != nil {
			return err
		}
		if privacy != user.PrivacyOpen {
			return errHTTPForbidden.Wrap("not a contact - send a contact request first")
		}
	}

	// Check if DM topic already exists between these users
	topic, err := s.userManager.FindDMTopic(u.Name, req.Username)
	if err != nil {
		return err
	}

	if topic == "" {
		// Generate new random DM topic ID
		topic, err = generateDMTopicID()
		if err != nil {
			return err
		}

		// Store DM user mapping in topic_meta
		if err := s.userManager.SetDMTopicMeta(topic, u.Name, req.Username); err != nil {
			return err
		}

		// Grant access to both users
		if err := s.userManager.AllowAccess(u.Name, topic, user.PermissionReadWrite); err != nil {
			return err
		}
		if err := s.userManager.AllowAccess(req.Username, topic, user.PermissionReadWrite); err != nil {
			return err
		}

		log.Tag(tagDM).Info("DM created: %s <-> %s (topic=%s)", u.Name, req.Username, topic)
	}

	// Resolve display name for the partner
	displayName := req.Username
	if profile, err := s.userManager.Profile(req.Username); err == nil && profile != nil && profile.DisplayName != "" {
		displayName = profile.DisplayName
	}

	return s.writeJSON(w, &apiDMCreateResponse{Topic: topic, DisplayName: displayName})
}

// handleDMList handles GET /v1/coop/dm - list all DMs for the current user
func (s *Server) handleDMList(w http.ResponseWriter, r *http.Request, v *visitor) error {
	u := v.User()
	dmEntries, err := s.userManager.DMTopics(u.Name)
	if err != nil {
		return err
	}

	entries := make([]*apiDMListEntry, 0, len(dmEntries))
	for _, dm := range dmEntries {
		entry := &apiDMListEntry{
			Topic:   dm.Topic,
			Partner: dm.Partner,
		}
		// Load partner profile
		profile, err := s.userManager.Profile(dm.Partner)
		if err == nil && profile != nil {
			entry.DisplayName = profile.DisplayName
			entry.AvatarURL = profile.AvatarURL
			entry.LastSeen = profile.LastSeen
		}
		entries = append(entries, entry)
	}

	return s.writeJSON(w, entries)
}
