package server

import (
	"encoding/json"
	"heckel.io/ntfy/v2/log"
	"heckel.io/ntfy/v2/user"
	"io"
	"net/http"
	"regexp"
	"strings"
)

const tagGroups = "groups"

var topicSlugRegex = regexp.MustCompile(`[^a-zA-Z0-9_-]`)

func topicSlug(name string) string {
	slug := strings.ToLower(strings.TrimSpace(name))
	slug = strings.ReplaceAll(slug, " ", "-")
	slug = topicSlugRegex.ReplaceAllString(slug, "")
	if len(slug) > 64 {
		slug = slug[:64]
	}
	return slug
}

// handleTopicMetaGet handles GET /v1/coop/topics/{topic}/meta
func (s *Server) handleTopicMetaGet(w http.ResponseWriter, r *http.Request, v *visitor) error {
	// Path: /v1/coop/topics/{topic}/meta
	path := strings.TrimPrefix(r.URL.Path, "/v1/coop/topics/")
	topic := strings.TrimSuffix(path, "/meta")
	if topic == "" {
		return errHTTPBadRequest.Wrap("missing topic")
	}

	meta, err := s.userManager.TopicMeta(topic)
	if err != nil {
		return err
	}
	if meta == nil {
		// Return default/empty meta
		meta = &user.TopicMeta{Topic: topic}
	}
	return s.writeJSON(w, meta)
}

type apiTopicMetaUpdateRequest struct {
	DisplayName string `json:"display_name"`
	Description string `json:"description"`
}

// handleTopicMetaUpdate handles PATCH /v1/coop/topics/{topic}/meta
func (s *Server) handleTopicMetaUpdate(w http.ResponseWriter, r *http.Request, v *visitor) error {
	u := v.User()
	path := strings.TrimPrefix(r.URL.Path, "/v1/coop/topics/")
	topic := strings.TrimSuffix(path, "/meta")
	if topic == "" {
		return errHTTPBadRequest.Wrap("missing topic")
	}

	// Check write access to topic
	if err := s.userManager.Authorize(u, topic, user.PermissionWrite); err != nil {
		return errHTTPForbidden
	}

	body, err := io.ReadAll(io.LimitReader(r.Body, 4096))
	if err != nil {
		return err
	}
	var req apiTopicMetaUpdateRequest
	if err := json.Unmarshal(body, &req); err != nil {
		return errHTTPBadRequest.Wrap("invalid request body")
	}

	if len(req.DisplayName) > 100 {
		req.DisplayName = req.DisplayName[:100]
	}
	if len(req.Description) > 500 {
		req.Description = req.Description[:500]
	}

	if err := s.userManager.SetTopicMeta(topic, req.DisplayName, req.Description, "", u.Name); err != nil {
		return err
	}

	log.Tag(tagGroups).Info("Topic meta updated: %s by %s", topic, u.Name)
	meta, err := s.userManager.TopicMeta(topic)
	if err != nil {
		return err
	}
	return s.writeJSON(w, meta)
}

type apiGroupCreateRequest struct {
	Name    string   `json:"name"`
	Members []string `json:"members"`
}

type apiGroupCreateResponse struct {
	Topic string `json:"topic"`
}

// handleGroupCreate handles POST /v1/coop/groups - create a group chat
func (s *Server) handleGroupCreate(w http.ResponseWriter, r *http.Request, v *visitor) error {
	u := v.User()
	body, err := io.ReadAll(io.LimitReader(r.Body, 8192))
	if err != nil {
		return err
	}
	var req apiGroupCreateRequest
	if err := json.Unmarshal(body, &req); err != nil {
		return errHTTPBadRequest.Wrap("invalid request body")
	}
	if req.Name == "" {
		return errHTTPBadRequest.Wrap("group name required")
	}
	if len(req.Members) == 0 {
		return errHTTPBadRequest.Wrap("at least one member required")
	}
	if len(req.Members) > 50 {
		return errHTTPBadRequest.Wrap("too many members (max 50)")
	}

	// Generate topic slug
	topic := "grp_" + topicSlug(req.Name)
	if topic == "grp_" {
		return errHTTPBadRequest.Wrap("invalid group name")
	}

	// Check if topic already exists
	existingMeta, err := s.userManager.TopicMeta(topic)
	if err != nil {
		return err
	}
	if existingMeta != nil {
		return errHTTPConflict.Wrap("group name conflicts with existing topic")
	}

	// Grant access to creator
	if err := s.userManager.AllowAccess(u.Name, topic, user.PermissionReadWrite); err != nil {
		return err
	}

	// Grant access to all members
	for _, member := range req.Members {
		if member == u.Name {
			continue // Already granted
		}
		// Verify user exists
		if _, err := s.userManager.User(member); err != nil {
			log.Tag(tagGroups).Warn("Skipping unknown member: %s", member)
			continue
		}
		if err := s.userManager.AllowAccess(member, topic, user.PermissionReadWrite); err != nil {
			log.Tag(tagGroups).Warn("Failed to grant access for %s: %v", member, err)
		}
	}

	// Set topic metadata
	if err := s.userManager.SetTopicMeta(topic, req.Name, "", "", u.Name); err != nil {
		return err
	}

	// Add subscriptions for creator and all members so the group appears in their sidebar
	if err := s.addSubscriptionsForUser(u.Name, []string{topic}); err != nil {
		log.Tag(tagGroups).Warn("Failed to add subscription for creator %s: %v", u.Name, err)
	}
	for _, member := range req.Members {
		if member == u.Name {
			continue
		}
		if err := s.addSubscriptionsForUser(member, []string{topic}); err != nil {
			log.Tag(tagGroups).Warn("Failed to add subscription for member %s: %v", member, err)
		}
	}

	log.Tag(tagGroups).Info("Group created: %s (topic=%s) by %s with %d members", req.Name, topic, u.Name, len(req.Members))
	return s.writeJSON(w, &apiGroupCreateResponse{Topic: topic})
}
