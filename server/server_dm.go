package server

import (
	"encoding/json"
	"fmt"
	"heckel.io/ntfy/v2/log"
	"heckel.io/ntfy/v2/user"
	"io"
	"net/http"
	"strings"
)

const tagDM = "dm"

// dmTopicName generates a deterministic DM topic name for two users (alphabetically sorted)
func dmTopicName(userA, userB string) string {
	if userA < userB {
		return fmt.Sprintf("dm_%s_%s", userA, userB)
	}
	return fmt.Sprintf("dm_%s_%s", userB, userA)
}

// isDMTopic checks if a topic name is a DM topic
func isDMTopic(topic string) bool {
	return strings.HasPrefix(topic, "dm_")
}

// dmPartner extracts the other user's name from a DM topic name
func dmPartner(topic, username string) string {
	if !isDMTopic(topic) {
		return ""
	}
	parts := strings.SplitN(strings.TrimPrefix(topic, "dm_"), "_", 2)
	if len(parts) != 2 {
		return ""
	}
	if parts[0] == username {
		return parts[1]
	}
	return parts[0]
}

type apiDMCreateRequest struct {
	Username string `json:"username"`
}

type apiDMCreateResponse struct {
	Topic string `json:"topic"`
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

	// Generate DM topic name
	topic := dmTopicName(u.Name, req.Username)

	// Grant access to both users (idempotent via upsert in AllowAccess)
	if err := s.userManager.AllowAccess(u.Name, topic, user.PermissionReadWrite); err != nil {
		return err
	}
	if err := s.userManager.AllowAccess(req.Username, topic, user.PermissionReadWrite); err != nil {
		return err
	}

	log.Tag(tagDM).Info("DM created/opened: %s <-> %s (topic=%s)", u.Name, req.Username, topic)
	return s.writeJSON(w, &apiDMCreateResponse{Topic: topic})
}

// handleDMList handles GET /v1/coop/dm - list all DMs for the current user
func (s *Server) handleDMList(w http.ResponseWriter, r *http.Request, v *visitor) error {
	u := v.User()
	topics, err := s.userManager.DMTopics(u.Name)
	if err != nil {
		return err
	}

	entries := make([]*apiDMListEntry, 0, len(topics))
	for _, topic := range topics {
		partner := dmPartner(topic, u.Name)
		if partner == "" {
			continue
		}
		entry := &apiDMListEntry{
			Topic:   topic,
			Partner: partner,
		}
		// Load partner profile
		profile, err := s.userManager.Profile(partner)
		if err == nil && profile != nil {
			entry.DisplayName = profile.DisplayName
			entry.AvatarURL = profile.AvatarURL
			entry.LastSeen = profile.LastSeen
		}
		entries = append(entries, entry)
	}

	return s.writeJSON(w, entries)
}
