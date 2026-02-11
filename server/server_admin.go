package server

import (
	"encoding/json"
	"errors"
	"heckel.io/ntfy/v2/user"
	"net/http"
	"strings"
)

// Admin API path constants
const (
	apiAdminUsersPath  = "/api/admin/users"
	apiAdminTopicsPath = "/api/admin/topics"
)

// Request/Response structs for admin user management
type apiAdminUserCreateRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

type apiAdminUserUpdateRequest struct {
	Password *string `json:"password,omitempty"`
	Role     *string `json:"role,omitempty"`
}

type apiAdminUserResponse struct {
	Username string `json:"username"`
	Role     string `json:"role"`
}

type apiAdminUsersResponse struct {
	Users []apiAdminUserResponse `json:"users"`
}

// Request/Response structs for admin topic management
type apiAdminTopicGrant struct {
	TopicPattern string `json:"topic_pattern"`
	Permission   string `json:"permission"`
}

type apiAdminTopicUser struct {
	Username string                 `json:"username"`
	Grants   []apiAdminTopicGrant   `json:"grants"`
}

type apiAdminTopicsResponse struct {
	Topics []apiAdminTopicUser `json:"topics"`
}

type apiAdminTopicAccessGrantRequest struct {
	Username     string `json:"username"`
	TopicPattern string `json:"topic_pattern"`
	Permission   string `json:"permission"`
}

type apiAdminTopicAccessRevokeRequest struct {
	Username     string `json:"username"`
	TopicPattern string `json:"topic_pattern"`
}

// Response structs for topic stats (message statistics per topic)
type apiAdminTopicStatsEntry struct {
	Topic        string `json:"topic"`
	MessageCount int    `json:"message_count"`
	LastActivity int64  `json:"last_activity"`
}

type apiAdminTopicStatsResponse struct {
	Topics []apiAdminTopicStatsEntry `json:"topics"`
}

// handleAdminUsersGet returns a list of all users with their roles (Admin endpoint)
func (s *Server) handleAdminUsersGet(w http.ResponseWriter, r *http.Request, v *visitor) error {
	logvr(v, r).Tag(tagAdmin).Info("admin: listing all users")

	if s.userManager == nil {
		return errHTTPInternalError
	}

	users, err := s.userManager.Users()
	if err != nil {
		logvr(v, r).Tag(tagAdmin).Err(err).Warn("admin: failed to list users")
		return errHTTPInternalError
	}

	response := &apiAdminUsersResponse{
		Users: make([]apiAdminUserResponse, 0, len(users)),
	}

	for _, u := range users {
		response.Users = append(response.Users, apiAdminUserResponse{
			Username: u.Name,
			Role:     string(u.Role),
		})
	}

	return s.writeJSON(w, response)
}

// handleAdminUserCreate creates a new user with specified role (Admin endpoint)
func (s *Server) handleAdminUserCreate(w http.ResponseWriter, r *http.Request, v *visitor) error {
	var req apiAdminUserCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return errHTTPBadRequest.Wrap("invalid JSON body")
	}

	if req.Username == "" || req.Password == "" || req.Role == "" {
		return errHTTPBadRequest.Wrap("username, password, and role are required")
	}

	logvr(v, r).Tag(tagAdmin).Info("admin: creating user %s with role %s", req.Username, req.Role)

	if s.userManager == nil {
		return errHTTPInternalError
	}

	// Validate and convert role
	role := user.Role(req.Role)
	if !user.AllowedRole(role) {
		logvr(v, r).Tag(tagAdmin).Warn("admin: invalid role %s", req.Role)
		return errHTTPBadRequest.Wrap("invalid role")
	}

	// Create user (password not hashed yet)
	if err := s.userManager.AddUser(req.Username, req.Password, role, false); err != nil {
		logvr(v, r).Tag(tagAdmin).Err(err).Warn("admin: failed to create user %s", req.Username)
		return errHTTPInternalError
	}

	response := &apiAdminUserResponse{
		Username: req.Username,
		Role:     string(role),
	}

	w.WriteHeader(http.StatusCreated)
	return s.writeJSON(w, response)
}

// handleAdminUserDelete deletes a user by username from URL path (Admin endpoint)
func (s *Server) handleAdminUserDelete(w http.ResponseWriter, r *http.Request, v *visitor) error {
	// Extract username from path: /api/admin/users/{username}
	username := strings.TrimPrefix(r.URL.Path, apiAdminUsersPath+"/")
	if username == "" || strings.Contains(username, "/") {
		return errHTTPNotFound
	}

	logvr(v, r).Tag(tagAdmin).Info("admin: deleting user %s", username)

	if s.userManager == nil {
		return errHTTPInternalError
	}

	if err := s.userManager.RemoveUser(username); err != nil {
		logvr(v, r).Tag(tagAdmin).Err(err).Warn("admin: failed to delete user %s", username)
		return errHTTPInternalError
	}

	w.WriteHeader(http.StatusNoContent)
	return nil
}

// handleAdminUserUpdate updates a user's password and/or role (Admin endpoint)
func (s *Server) handleAdminUserUpdate(w http.ResponseWriter, r *http.Request, v *visitor) error {
	// Extract username from path: /api/admin/users/{username}
	username := strings.TrimPrefix(r.URL.Path, apiAdminUsersPath+"/")
	if username == "" || strings.Contains(username, "/") {
		return errHTTPNotFound
	}

	var req apiAdminUserUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return errHTTPBadRequest.Wrap("invalid JSON body")
	}

	if req.Password == nil && req.Role == nil {
		return errHTTPBadRequest.Wrap("at least one of password or role must be provided")
	}

	logvr(v, r).Tag(tagAdmin).Info("admin: updating user %s", username)

	if s.userManager == nil {
		return errHTTPInternalError
	}

	// Update password if provided
	if req.Password != nil {
		if err := s.userManager.ChangePassword(username, *req.Password, false); err != nil {
			logvr(v, r).Tag(tagAdmin).Err(err).Warn("admin: failed to change password for user %s", username)
			return errHTTPInternalError
		}
	}

	// Update role if provided
	if req.Role != nil {
		role := user.Role(*req.Role)
		if !user.AllowedRole(role) {
			logvr(v, r).Tag(tagAdmin).Warn("admin: invalid role %s", *req.Role)
			return errHTTPBadRequest.Wrap("invalid role")
		}

		if err := s.userManager.ChangeRole(username, role); err != nil {
			logvr(v, r).Tag(tagAdmin).Err(err).Warn("admin: failed to change role for user %s", username)
			return errHTTPInternalError
		}
	}

	// Get updated user info
	u, err := s.userManager.User(username)
	if err != nil {
		logvr(v, r).Tag(tagAdmin).Err(err).Warn("admin: failed to get user %s after update", username)
		return errHTTPInternalError
	}

	response := &apiAdminUserResponse{
		Username: u.Name,
		Role:     string(u.Role),
	}

	return s.writeJSON(w, response)
}

// handleAdminTopicsGet returns all topics with their grants per user (Admin endpoint)
func (s *Server) handleAdminTopicsGet(w http.ResponseWriter, r *http.Request, v *visitor) error {
	logvr(v, r).Tag(tagAdmin).Info("admin: listing all topics and grants")

	if s.userManager == nil {
		return errHTTPInternalError
	}

	users, err := s.userManager.Users()
	if err != nil {
		logvr(v, r).Tag(tagAdmin).Err(err).Warn("admin: failed to list users")
		return errHTTPInternalError
	}

	grants, err := s.userManager.AllGrants()
	if err != nil {
		logvr(v, r).Tag(tagAdmin).Err(err).Warn("admin: failed to list grants")
		return errHTTPInternalError
	}

	response := &apiAdminTopicsResponse{
		Topics: make([]apiAdminTopicUser, 0),
	}

	for _, u := range users {
		userGrants := grants[u.ID]
		if len(userGrants) == 0 {
			continue
		}
		topicUser := apiAdminTopicUser{
			Username: u.Name,
			Grants:   make([]apiAdminTopicGrant, 0, len(userGrants)),
		}
		for _, g := range userGrants {
			topicUser.Grants = append(topicUser.Grants, apiAdminTopicGrant{
				TopicPattern: g.TopicPattern,
				Permission:   g.Permission.String(),
			})
		}
		response.Topics = append(response.Topics, topicUser)
	}

	return s.writeJSON(w, response)
}

// handleAdminTopicAccessGrant grants access to a topic for a user (Admin endpoint)
func (s *Server) handleAdminTopicAccessGrant(w http.ResponseWriter, r *http.Request, v *visitor) error {
	var req apiAdminTopicAccessGrantRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return errHTTPBadRequest.Wrap("invalid JSON body")
	}

	if req.Username == "" || req.TopicPattern == "" || req.Permission == "" {
		return errHTTPBadRequest.Wrap("username, topic_pattern, and permission are required")
	}

	logvr(v, r).Tag(tagAdmin).Info("admin: granting %s access to topic %s for user %s", req.Permission, req.TopicPattern, req.Username)

	if s.userManager == nil {
		return errHTTPInternalError
	}

	// Parse permission
	permission, err := user.ParsePermission(req.Permission)
	if err != nil {
		logvr(v, r).Tag(tagAdmin).Err(err).Warn("admin: invalid permission %s", req.Permission)
		return errHTTPBadRequestPermissionInvalid
	}

	// Grant access
	if err := s.userManager.AllowAccess(req.Username, req.TopicPattern, permission); err != nil {
		logvr(v, r).Tag(tagAdmin).Err(err).Warn("admin: failed to grant access for user %s", req.Username)
		return errHTTPInternalError
	}

	w.WriteHeader(http.StatusCreated)
	return nil
}

// handleAdminTopicAccessRevoke revokes access to a topic for a user (Admin endpoint)
func (s *Server) handleAdminTopicAccessRevoke(w http.ResponseWriter, r *http.Request, v *visitor) error {
	var req apiAdminTopicAccessRevokeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return errHTTPBadRequest.Wrap("invalid JSON body")
	}

	if req.Username == "" || req.TopicPattern == "" {
		return errHTTPBadRequest.Wrap("username and topic_pattern are required")
	}

	logvr(v, r).Tag(tagAdmin).Info("admin: revoking access to topic %s for user %s", req.TopicPattern, req.Username)

	if s.userManager == nil {
		return errHTTPInternalError
	}

	// Revoke access
	if err := s.userManager.ResetAccess(req.Username, req.TopicPattern); err != nil {
		logvr(v, r).Tag(tagAdmin).Err(err).Warn("admin: failed to revoke access for user %s", req.Username)
		return errHTTPInternalError
	}

	w.WriteHeader(http.StatusNoContent)
	return nil
}

// handleAdminTopicStatsList returns message statistics for all topics (Admin endpoint)
func (s *Server) handleAdminTopicStatsList(w http.ResponseWriter, r *http.Request, v *visitor) error {
	logvr(v, r).Tag(tagAdmin).Info("admin: listing topic stats")

	stats, err := s.messageCache.TopicStats()
	if err != nil {
		logvr(v, r).Tag(tagAdmin).Err(err).Warn("admin: failed to list topic stats")
		return errHTTPInternalError
	}

	response := &apiAdminTopicStatsResponse{
		Topics: make([]apiAdminTopicStatsEntry, 0, len(stats)),
	}
	for _, st := range stats {
		response.Topics = append(response.Topics, apiAdminTopicStatsEntry{
			Topic:        st.Topic,
			MessageCount: st.MessageCount,
			LastActivity: st.LastActivity,
		})
	}

	return s.writeJSON(w, response)
}

// handleAdminTopicDelete deletes all messages for a topic and cleans up attachments (Admin endpoint)
func (s *Server) handleAdminTopicDelete(w http.ResponseWriter, r *http.Request, v *visitor) error {
	topic := strings.TrimPrefix(r.URL.Path, "/v1/admin/topics/")
	if topic == "" || strings.Contains(topic, "/") {
		return errHTTPNotFound
	}

	logvr(v, r).Tag(tagAdmin).Info("admin: deleting all messages for topic %s", topic)

	ids, err := s.messageCache.DeleteMessagesByTopic(topic)
	if err != nil {
		logvr(v, r).Tag(tagAdmin).Err(err).Warn("admin: failed to delete messages for topic %s", topic)
		return errHTTPInternalError
	}

	// Clean up attachments if file cache exists
	if s.fileCache != nil && len(ids) > 0 {
		if err := s.fileCache.Remove(ids...); err != nil {
			logvr(v, r).Tag(tagAdmin).Err(err).Warn("admin: failed to remove attachments for topic %s", topic)
		}
	}

	logvr(v, r).Tag(tagAdmin).Info("admin: deleted %d messages for topic %s", len(ids), topic)

	w.WriteHeader(http.StatusNoContent)
	return nil
}

// Legacy handlers (kept for backward compatibility)

func (s *Server) handleVersion(w http.ResponseWriter, r *http.Request, v *visitor) error {
	return s.writeJSON(w, &apiVersionResponse{
		Version: s.config.BuildVersion,
		Commit:  s.config.BuildCommit,
		Date:    s.config.BuildDate,
	})
}

func (s *Server) handleUsersGet(w http.ResponseWriter, r *http.Request, v *visitor) error {
	users, err := s.userManager.Users()
	if err != nil {
		return err
	}
	grants, err := s.userManager.AllGrants()
	if err != nil {
		return err
	}
	usersResponse := make([]*apiUserResponse, len(users))
	for i, u := range users {
		tier := ""
		if u.Tier != nil {
			tier = u.Tier.Code
		}
		userGrants := make([]*apiUserGrantResponse, len(grants[u.ID]))
		for i, g := range grants[u.ID] {
			userGrants[i] = &apiUserGrantResponse{
				Topic:      g.TopicPattern,
				Permission: g.Permission.String(),
			}
		}
		usersResponse[i] = &apiUserResponse{
			Username: u.Name,
			Role:     string(u.Role),
			Tier:     tier,
			Grants:   userGrants,
		}
	}
	return s.writeJSON(w, usersResponse)
}

func (s *Server) handleUsersAdd(w http.ResponseWriter, r *http.Request, v *visitor) error {
	req, err := readJSONWithLimit[apiUserAddOrUpdateRequest](r.Body, jsonBodyBytesLimit, false)
	if err != nil {
		return err
	} else if !user.AllowedUsername(req.Username) || (req.Password == "" && req.Hash == "") {
		return errHTTPBadRequest.Wrap("username invalid, or password/password_hash missing")
	}
	u, err := s.userManager.User(req.Username)
	if err != nil && !errors.Is(err, user.ErrUserNotFound) {
		return err
	} else if u != nil {
		return errHTTPConflictUserExists
	}
	var tier *user.Tier
	if req.Tier != "" {
		tier, err = s.userManager.Tier(req.Tier)
		if errors.Is(err, user.ErrTierNotFound) {
			return errHTTPBadRequestTierInvalid
		} else if err != nil {
			return err
		}
	}
	password, hashed := req.Password, false
	if req.Hash != "" {
		password, hashed = req.Hash, true
	}
	if err := s.userManager.AddUser(req.Username, password, user.RoleUser, hashed); err != nil {
		return err
	}
	if tier != nil {
		if err := s.userManager.ChangeTier(req.Username, req.Tier); err != nil {
			return err
		}
	}
	return s.writeJSON(w, newSuccessResponse())
}

func (s *Server) handleUsersUpdate(w http.ResponseWriter, r *http.Request, v *visitor) error {
	req, err := readJSONWithLimit[apiUserAddOrUpdateRequest](r.Body, jsonBodyBytesLimit, false)
	if err != nil {
		return err
	} else if !user.AllowedUsername(req.Username) {
		return errHTTPBadRequest.Wrap("username invalid")
	} else if req.Password == "" && req.Hash == "" && req.Tier == "" {
		return errHTTPBadRequest.Wrap("need to provide at least one of \"password\", \"password_hash\" or \"tier\"")
	}
	u, err := s.userManager.User(req.Username)
	if err != nil && !errors.Is(err, user.ErrUserNotFound) {
		return err
	} else if u != nil {
		if u.IsAdmin() {
			return errHTTPForbidden
		}
		if req.Hash != "" {
			if err := s.userManager.ChangePassword(req.Username, req.Hash, true); err != nil {
				return err
			}
		} else if req.Password != "" {
			if err := s.userManager.ChangePassword(req.Username, req.Password, false); err != nil {
				return err
			}
		}
	} else {
		password, hashed := req.Password, false
		if req.Hash != "" {
			password, hashed = req.Hash, true
		}
		if err := s.userManager.AddUser(req.Username, password, user.RoleUser, hashed); err != nil {
			return err
		}
	}
	if req.Tier != "" {
		if _, err = s.userManager.Tier(req.Tier); errors.Is(err, user.ErrTierNotFound) {
			return errHTTPBadRequestTierInvalid
		} else if err != nil {
			return err
		}
		if err := s.userManager.ChangeTier(req.Username, req.Tier); err != nil {
			return err
		}
	}
	return s.writeJSON(w, newSuccessResponse())
}

func (s *Server) handleUsersDelete(w http.ResponseWriter, r *http.Request, v *visitor) error {
	req, err := readJSONWithLimit[apiUserDeleteRequest](r.Body, jsonBodyBytesLimit, false)
	if err != nil {
		return err
	}
	u, err := s.userManager.User(req.Username)
	if errors.Is(err, user.ErrUserNotFound) {
		return errHTTPBadRequestUserNotFound
	} else if err != nil {
		return err
	} else if !u.IsUser() {
		return errHTTPUnauthorized.Wrap("can only remove regular users from API")
	}
	if err := s.userManager.RemoveUser(req.Username); err != nil {
		return err
	}
	if err := s.killUserSubscriber(u, "*"); err != nil { // FIXME super inefficient
		return err
	}
	return s.writeJSON(w, newSuccessResponse())
}

func (s *Server) handleAccessAllow(w http.ResponseWriter, r *http.Request, v *visitor) error {
	req, err := readJSONWithLimit[apiAccessAllowRequest](r.Body, jsonBodyBytesLimit, false)
	if err != nil {
		return err
	}
	_, err = s.userManager.User(req.Username)
	if errors.Is(err, user.ErrUserNotFound) {
		return errHTTPBadRequestUserNotFound
	} else if err != nil {
		return err
	}
	permission, err := user.ParsePermission(req.Permission)
	if err != nil {
		return errHTTPBadRequestPermissionInvalid
	}
	if err := s.userManager.AllowAccess(req.Username, req.Topic, permission); err != nil {
		return err
	}
	return s.writeJSON(w, newSuccessResponse())
}

func (s *Server) handleAccessReset(w http.ResponseWriter, r *http.Request, v *visitor) error {
	req, err := readJSONWithLimit[apiAccessResetRequest](r.Body, jsonBodyBytesLimit, false)
	if err != nil {
		return err
	}
	u, err := s.userManager.User(req.Username)
	if err != nil {
		return err
	}
	if err := s.userManager.ResetAccess(req.Username, req.Topic); err != nil {
		return err
	}
	if err := s.killUserSubscriber(u, req.Topic); err != nil { // This may be a pattern
		return err
	}
	return s.writeJSON(w, newSuccessResponse())
}

func (s *Server) killUserSubscriber(u *user.User, topicPattern string) error {
	topics, err := s.topicsFromPattern(topicPattern)
	if err != nil {
		return err
	}
	for _, t := range topics {
		t.CancelSubscriberUser(u.ID)
	}
	return nil
}
