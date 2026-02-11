package server

import (
	"database/sql"
	"net/http"
	"strconv"
	"strings"
	"time"

	"heckel.io/ntfy/v2/log"
	"heckel.io/ntfy/v2/user"
)

// apiJoinRequestCreateRequest is the request body for creating a join request
type apiJoinRequestCreateRequest struct {
	Topic string `json:"topic"`
}

// apiJoinRequest represents a join request in API responses
type apiJoinRequest struct {
	ID         int64  `json:"id"`
	Username   string `json:"username"`
	Topic      string `json:"topic"`
	Status     string `json:"status"`
	CreatedAt  int64  `json:"created_at"`
	ResolvedAt int64  `json:"resolved_at"`
	ResolvedBy string `json:"resolved_by"`
}

// apiJoinRequestResolveRequest is the request body for resolving a join request
type apiJoinRequestResolveRequest struct {
	Status string `json:"status"`
}

// handleJoinRequestCreate creates a new join request (authenticated user)
func (s *Server) handleJoinRequestCreate(w http.ResponseWriter, r *http.Request, v *visitor) error {
	req, err := readJSONWithLimit[apiJoinRequestCreateRequest](r.Body, jsonBodyBytesLimit, false)
	if err != nil {
		return err
	}
	if req.Topic == "" {
		return errHTTPBadRequest.Wrap("topic is required")
	}
	username := v.User().Name
	now := time.Now().Unix()
	db := s.messageCache.DB()
	if _, err := db.Exec(
		`INSERT INTO join_requests (username, topic, status, created_at) VALUES (?, ?, 'pending', ?)`,
		username, req.Topic, now,
	); err != nil {
		if strings.Contains(err.Error(), "UNIQUE constraint") {
			return errHTTPBadRequest.Wrap("join request already exists for this topic")
		}
		return err
	}
	return s.writeJSON(w, newSuccessResponse())
}

// handleJoinRequestList lists join requests (admin only)
func (s *Server) handleJoinRequestList(w http.ResponseWriter, r *http.Request, v *visitor) error {
	db := s.messageCache.DB()
	statusFilter := r.URL.Query().Get("status")
	if statusFilter != "" && statusFilter != "pending" && statusFilter != "approved" && statusFilter != "denied" {
		return errHTTPBadRequest.Wrap("invalid status filter")
	}
	query := `SELECT id, username, topic, status, created_at, resolved_at, resolved_by FROM join_requests`
	var args []any
	if statusFilter != "" {
		query += ` WHERE status = ?`
		args = append(args, statusFilter)
	}
	query += ` ORDER BY created_at DESC`
	rows, err := db.Query(query, args...)
	if err != nil {
		return err
	}
	defer rows.Close()
	requests := make([]*apiJoinRequest, 0)
	for rows.Next() {
		jr := &apiJoinRequest{}
		if err := rows.Scan(&jr.ID, &jr.Username, &jr.Topic, &jr.Status, &jr.CreatedAt, &jr.ResolvedAt, &jr.ResolvedBy); err != nil {
			return err
		}
		requests = append(requests, jr)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	return s.writeJSON(w, requests)
}

// handleJoinRequestResolve approves or denies a join request (admin only)
func (s *Server) handleJoinRequestResolve(w http.ResponseWriter, r *http.Request, v *visitor) error {
	idStr := strings.TrimPrefix(r.URL.Path, "/v1/join-requests/")
	if strings.Contains(idStr, "/") {
		return errHTTPBadRequest.Wrap("invalid join request ID")
	}
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return errHTTPBadRequest.Wrap("invalid join request ID")
	}
	req, err := readJSONWithLimit[apiJoinRequestResolveRequest](r.Body, jsonBodyBytesLimit, false)
	if err != nil {
		return err
	}
	if req.Status != "approved" && req.Status != "denied" {
		return errHTTPBadRequest.Wrap("status must be 'approved' or 'denied'")
	}
	// Look up the join request
	db := s.messageCache.DB()
	var username, topic, currentStatus string
	err = db.QueryRow(
		`SELECT username, topic, status FROM join_requests WHERE id = ?`, id,
	).Scan(&username, &topic, &currentStatus)
	if err == sql.ErrNoRows {
		return errHTTPNotFound
	} else if err != nil {
		return err
	}
	if currentStatus != "pending" {
		return errHTTPBadRequest.Wrap("join request is already resolved")
	}
	// Update the request status first
	resolvedBy := ""
	if u := v.User(); u != nil {
		resolvedBy = u.Name
	}
	now := time.Now().Unix()
	if _, err := db.Exec(
		`UPDATE join_requests SET status = ?, resolved_at = ?, resolved_by = ? WHERE id = ?`,
		req.Status, now, resolvedBy, id,
	); err != nil {
		return err
	}
	// If approved, grant access and add subscription (after status update to avoid inconsistency)
	if req.Status == "approved" {
		if err := s.userManager.AllowAccess(username, topic, user.PermissionReadWrite); err != nil {
			// Best-effort revert status on failure
			if _, revertErr := db.Exec(`UPDATE join_requests SET status = 'pending', resolved_at = 0, resolved_by = '' WHERE id = ?`, id); revertErr != nil {
				log.Warn("Join request %d: failed to revert status after AllowAccess error: %v", id, revertErr)
			}
			return err
		}
		// Add topic as account subscription so it appears in the user's sidebar
		targetUser, err := s.userManager.User(username)
		if err == nil && targetUser != nil {
			prefs := targetUser.Prefs
			if prefs == nil {
				prefs = &user.Prefs{}
			}
			alreadyExists := false
			for _, sub := range prefs.Subscriptions {
				if sub.BaseURL == s.config.BaseURL && sub.Topic == topic {
					alreadyExists = true
					break
				}
			}
			if !alreadyExists {
				prefs.Subscriptions = append(prefs.Subscriptions, &user.Subscription{
					BaseURL: s.config.BaseURL,
					Topic:   topic,
				})
				if err := s.userManager.ChangeSettings(targetUser.ID, prefs); err != nil {
					log.Warn("Join request %d: failed to add subscription for user %s: %v", id, username, err)
				}
			}
		}
	}
	return s.writeJSON(w, newSuccessResponse())
}
