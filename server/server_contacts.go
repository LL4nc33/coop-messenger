package server

import (
	"encoding/json"
	"heckel.io/ntfy/v2/log"
	"heckel.io/ntfy/v2/user"
	"io"
	"net/http"
	"strings"
)

const tagContacts = "contacts"

// handleContactList handles GET /v1/coop/contacts - returns accepted contacts
func (s *Server) handleContactList(w http.ResponseWriter, r *http.Request, v *visitor) error {
	u := v.User()
	contacts, err := s.userManager.Contacts(u.Name, user.ContactStatusAccepted)
	if err != nil {
		return err
	}
	return s.writeJSON(w, contacts)
}

// handleContactRequests handles GET /v1/coop/contacts/requests - returns pending incoming requests
func (s *Server) handleContactRequests(w http.ResponseWriter, r *http.Request, v *visitor) error {
	u := v.User()
	contacts, err := s.userManager.ContactRequests(u.Name)
	if err != nil {
		return err
	}
	return s.writeJSON(w, contacts)
}

type apiContactAddRequest struct {
	Username string `json:"username"`
}

// handleContactAdd handles POST /v1/coop/contacts - send a contact request
func (s *Server) handleContactAdd(w http.ResponseWriter, r *http.Request, v *visitor) error {
	u := v.User()
	body, err := io.ReadAll(io.LimitReader(r.Body, 4096))
	if err != nil {
		return err
	}
	var req apiContactAddRequest
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

	// Check existing relationship
	existingStatus, err := s.userManager.ContactStatus(u.Name, req.Username)
	if err != nil {
		return err
	}
	if existingStatus != "" {
		return errHTTPConflict.Wrap("contact relationship already exists")
	}

	// Check target's privacy setting
	privacy, err := s.userManager.ProfilePrivacy(req.Username)
	if err != nil {
		return err
	}

	switch privacy {
	case user.PrivacyInviteOnly:
		return errHTTPForbidden.Wrap("user only accepts contacts via invite")
	case user.PrivacyOpen:
		// Auto-accept: create both directions as accepted
		if err := s.userManager.AddContact(u.Name, req.Username, user.ContactStatusAccepted); err != nil {
			return err
		}
		if err := s.userManager.AddContact(req.Username, u.Name, user.ContactStatusAccepted); err != nil {
			return err
		}
		log.Tag(tagContacts).Info("Contact auto-accepted: %s <-> %s (privacy=open)", u.Name, req.Username)
	default: // PrivacyRequest
		// Create pending request
		if err := s.userManager.AddContact(u.Name, req.Username, user.ContactStatusPending); err != nil {
			return err
		}
		log.Tag(tagContacts).Info("Contact request sent: %s -> %s", u.Name, req.Username)
	}

	return s.writeJSON(w, newSuccessResponse())
}

type apiContactUpdateRequest struct {
	Status string `json:"status"`
}

// handleContactUpdate handles PUT /v1/coop/contacts/{username} - accept/reject a request
func (s *Server) handleContactUpdate(w http.ResponseWriter, r *http.Request, v *visitor) error {
	u := v.User()
	targetUsername := strings.TrimPrefix(r.URL.Path, "/v1/coop/contacts/")
	if targetUsername == "" {
		return errHTTPBadRequest.Wrap("missing username")
	}

	body, err := io.ReadAll(io.LimitReader(r.Body, 4096))
	if err != nil {
		return err
	}
	var req apiContactUpdateRequest
	if err := json.Unmarshal(body, &req); err != nil {
		return errHTTPBadRequest.Wrap("invalid request body")
	}
	if req.Status != user.ContactStatusAccepted && req.Status != "rejected" {
		return errHTTPBadRequest.Wrap("status must be 'accepted' or 'rejected'")
	}

	if req.Status == "rejected" {
		// Delete the request
		if err := s.userManager.DeleteContact(targetUsername, u.Name); err != nil {
			return err
		}
		log.Tag(tagContacts).Info("Contact request rejected: %s rejected %s", u.Name, targetUsername)
	} else {
		// Accept: update the existing request AND create reverse entry
		if err := s.userManager.UpdateContactStatus(targetUsername, u.Name, user.ContactStatusAccepted); err != nil {
			return err
		}
		// Create reverse relationship
		if err := s.userManager.AddContact(u.Name, targetUsername, user.ContactStatusAccepted); err != nil {
			// Ignore duplicate error - might already exist
			log.Tag(tagContacts).Debug("Reverse contact already exists or error: %v", err)
		}
		log.Tag(tagContacts).Info("Contact request accepted: %s accepted %s", u.Name, targetUsername)
	}

	return s.writeJSON(w, newSuccessResponse())
}

// handleContactDelete handles DELETE /v1/coop/contacts/{username} - remove a contact
func (s *Server) handleContactDelete(w http.ResponseWriter, r *http.Request, v *visitor) error {
	u := v.User()
	targetUsername := strings.TrimPrefix(r.URL.Path, "/v1/coop/contacts/")
	if targetUsername == "" || strings.Contains(targetUsername, "/") {
		return errHTTPBadRequest.Wrap("missing username")
	}

	if err := s.userManager.DeleteContact(u.Name, targetUsername); err != nil {
		return err
	}
	log.Tag(tagContacts).Info("Contact removed: %s removed %s", u.Name, targetUsername)
	return s.writeJSON(w, newSuccessResponse())
}

// handleContactBlock handles POST /v1/coop/contacts/{username}/block - block a user
func (s *Server) handleContactBlock(w http.ResponseWriter, r *http.Request, v *visitor) error {
	u := v.User()
	// Path: /v1/coop/contacts/{username}/block
	path := strings.TrimPrefix(r.URL.Path, "/v1/coop/contacts/")
	targetUsername := strings.TrimSuffix(path, "/block")
	if targetUsername == "" || targetUsername == u.Name {
		return errHTTPBadRequest.Wrap("invalid username")
	}

	if err := s.userManager.BlockContact(u.Name, targetUsername); err != nil {
		return err
	}
	log.Tag(tagContacts).Info("User blocked: %s blocked %s", u.Name, targetUsername)
	return s.writeJSON(w, newSuccessResponse())
}

// handleUserSearch handles GET /v1/coop/users/search?q=... - search users
func (s *Server) handleUserSearch(w http.ResponseWriter, r *http.Request, v *visitor) error {
	u := v.User()
	query := r.URL.Query().Get("q")
	if query == "" || len(query) < 2 {
		return errHTTPBadRequest.Wrap("query must be at least 2 characters")
	}
	if len(query) > 50 {
		query = query[:50]
	}

	results, err := s.userManager.SearchUsers(query, u.Name)
	if err != nil {
		return err
	}

	// Filter out blocked users
	filtered := make([]*user.UserSearchResult, 0, len(results))
	for _, r := range results {
		blocked, err := s.userManager.IsBlocked(u.Name, r.Username)
		if err != nil {
			continue
		}
		if !blocked {
			filtered = append(filtered, r)
		}
	}

	return s.writeJSON(w, filtered)
}
