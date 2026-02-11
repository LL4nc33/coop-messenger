package server

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"net/http"
	"strings"
	"time"

	"heckel.io/ntfy/v2/user"
)

const (
	inviteTokenLength = 12
)

// Coop invite error codes (40050-40053)
var (
	errHTTPBadRequestInviteNotFound = &errHTTP{40050, http.StatusBadRequest, "invalid request: invite not found", "", nil}
	errHTTPBadRequestInviteExpired  = &errHTTP{40051, http.StatusBadRequest, "invalid request: invite has expired", "", nil}
	errHTTPBadRequestInviteMaxUsed  = &errHTTP{40052, http.StatusBadRequest, "invalid request: invite has reached maximum uses", "", nil}
	errHTTPBadRequestInviteInvalid  = &errHTTP{40053, http.StatusBadRequest, "invalid request: invite token is invalid", "", nil}
)

// invite represents a stored invite record
type invite struct {
	Token     string `json:"token"`
	CreatedBy string `json:"created_by"`
	Topics    string `json:"topics"`
	MaxUses   int    `json:"max_uses"`
	UsedCount int    `json:"used_count"`
	ExpiresAt int64  `json:"expires_at"`
	CreatedAt int64  `json:"created_at"`
}

// apiInviteCreateRequest is the request body for creating an invite
type apiInviteCreateRequest struct {
	Topics  string `json:"topics"`
	MaxUses int    `json:"max_uses"`
	Expires int64  `json:"expires"`
}

// apiInviteResponse is the response for invite create and list operations
type apiInviteResponse struct {
	Token     string `json:"token"`
	CreatedBy string `json:"created_by"`
	Topics    string `json:"topics"`
	MaxUses   int    `json:"max_uses"`
	UsedCount int    `json:"used_count"`
	ExpiresAt int64  `json:"expires_at"`
	CreatedAt int64  `json:"created_at"`
	URL       string `json:"url,omitempty"`
}

// apiInviteRedeemRequest is the request body for redeeming an invite
type apiInviteRedeemRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// apiInviteInfoResponse is the public response for invite info
type apiInviteInfoResponse struct {
	Token     string `json:"token"`
	Topics    string `json:"topics"`
	ExpiresAt int64  `json:"expires_at"`
	Available bool   `json:"available"`
}

// generateInviteToken generates a random hex-encoded token for invites
func generateInviteToken() (string, error) {
	b := make([]byte, inviteTokenLength)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// handleInviteCreate creates a new invite token (admin only)
func (s *Server) handleInviteCreate(w http.ResponseWriter, r *http.Request, v *visitor) error {
	req, err := readJSONWithLimit[apiInviteCreateRequest](r.Body, jsonBodyBytesLimit, false)
	if err != nil {
		return err
	}
	token, err := generateInviteToken()
	if err != nil {
		return err
	}
	now := time.Now().Unix()
	expiresAt := req.Expires
	if expiresAt == 0 {
		expiresAt = now + 7*24*60*60 // Default: 7 days
	}
	maxUses := req.MaxUses
	if maxUses <= 0 {
		maxUses = 1
	}
	createdBy := ""
	if u := v.User(); u != nil {
		createdBy = u.Name
	}
	db := s.messageCache.DB()
	if _, err := db.Exec(
		`INSERT INTO invites (token, created_by, topics, max_uses, used_count, expires_at, created_at) VALUES (?, ?, ?, ?, 0, ?, ?)`,
		token, createdBy, req.Topics, maxUses, expiresAt, now,
	); err != nil {
		return err
	}
	inviteURL := ""
	if s.config.BaseURL != "" {
		inviteURL = s.config.BaseURL + "/v1/invite/" + token
	}
	return s.writeJSON(w, &apiInviteResponse{
		Token:     token,
		CreatedBy: createdBy,
		Topics:    req.Topics,
		MaxUses:   maxUses,
		UsedCount: 0,
		ExpiresAt: expiresAt,
		CreatedAt: now,
		URL:       inviteURL,
	})
}

// handleInviteList lists all invites (admin only)
func (s *Server) handleInviteList(w http.ResponseWriter, r *http.Request, v *visitor) error {
	db := s.messageCache.DB()
	rows, err := db.Query(`SELECT token, created_by, topics, max_uses, used_count, expires_at, created_at FROM invites ORDER BY created_at DESC`)
	if err != nil {
		return err
	}
	defer rows.Close()
	invites := make([]*apiInviteResponse, 0)
	for rows.Next() {
		inv := &invite{}
		if err := rows.Scan(&inv.Token, &inv.CreatedBy, &inv.Topics, &inv.MaxUses, &inv.UsedCount, &inv.ExpiresAt, &inv.CreatedAt); err != nil {
			return err
		}
		inviteURL := ""
		if s.config.BaseURL != "" {
			inviteURL = s.config.BaseURL + "/v1/invite/" + inv.Token
		}
		invites = append(invites, &apiInviteResponse{
			Token:     inv.Token,
			CreatedBy: inv.CreatedBy,
			Topics:    inv.Topics,
			MaxUses:   inv.MaxUses,
			UsedCount: inv.UsedCount,
			ExpiresAt: inv.ExpiresAt,
			CreatedAt: inv.CreatedAt,
			URL:       inviteURL,
		})
	}
	if err := rows.Err(); err != nil {
		return err
	}
	return s.writeJSON(w, invites)
}

// handleInviteDelete deletes an invite by token (admin only)
func (s *Server) handleInviteDelete(w http.ResponseWriter, r *http.Request, v *visitor) error {
	token := strings.TrimPrefix(r.URL.Path, "/v1/invites/")
	if token == "" {
		return errHTTPBadRequestInviteInvalid
	}
	db := s.messageCache.DB()
	result, err := db.Exec(`DELETE FROM invites WHERE token = ?`, token)
	if err != nil {
		return err
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return errHTTPBadRequestInviteNotFound
	}
	return s.writeJSON(w, newSuccessResponse())
}

// handleInviteInfo returns public info about an invite (public)
func (s *Server) handleInviteInfo(w http.ResponseWriter, r *http.Request, v *visitor) error {
	token := strings.TrimPrefix(r.URL.Path, "/v1/invite/")
	if token == "" {
		return errHTTPBadRequestInviteInvalid
	}
	inv, err := s.lookupInvite(token)
	if err != nil {
		return err
	}
	return s.writeJSON(w, &apiInviteInfoResponse{
		Token:     inv.Token,
		Topics:    inv.Topics,
		ExpiresAt: inv.ExpiresAt,
		Available: inv.UsedCount < inv.MaxUses,
	})
}

// handleInviteRedeem redeems an invite to create a new user account (public)
func (s *Server) handleInviteRedeem(w http.ResponseWriter, r *http.Request, v *visitor) error {
	path := strings.TrimPrefix(r.URL.Path, "/v1/invite/")
	token := strings.TrimSuffix(path, "/redeem")
	if token == "" {
		return errHTTPBadRequestInviteInvalid
	}
	inv, err := s.lookupInvite(token)
	if err != nil {
		return err
	}
	req, err := readJSONWithLimit[apiInviteRedeemRequest](r.Body, jsonBodyBytesLimit, false)
	if err != nil {
		return err
	}
	if !user.AllowedUsername(req.Username) || req.Password == "" {
		return errHTTPBadRequest.Wrap("username invalid or password missing")
	}
	// Atomically increment used_count to prevent race condition (TOCTOU)
	db := s.messageCache.DB()
	result, err := db.Exec(
		`UPDATE invites SET used_count = used_count + 1 WHERE token = ? AND used_count < max_uses`,
		token,
	)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return errHTTPBadRequestInviteMaxUsed
	}
	// Check if user already exists
	u, err := s.userManager.User(req.Username)
	if err != nil && !errors.Is(err, user.ErrUserNotFound) {
		return err
	} else if u != nil {
		return errHTTPConflictUserExists
	}
	// Create user account
	if err := s.userManager.AddUser(req.Username, req.Password, user.RoleUser, false); err != nil {
		return err
	}
	// Grant access to topics and add as account subscriptions
	var grantedTopics []string
	if inv.Topics != "" {
		for _, topic := range strings.Split(inv.Topics, ",") {
			topic = strings.TrimSpace(topic)
			if topic != "" {
				if err := s.userManager.AllowAccess(req.Username, topic, user.PermissionReadWrite); err != nil {
					return err
				}
				grantedTopics = append(grantedTopics, topic)
			}
		}
	}
	// Add topics as account subscriptions so they appear after first login
	if len(grantedTopics) > 0 {
		newUser, err := s.userManager.User(req.Username)
		if err != nil {
			return err
		}
		prefs := newUser.Prefs
		if prefs == nil {
			prefs = &user.Prefs{}
		}
		for _, topic := range grantedTopics {
			prefs.Subscriptions = append(prefs.Subscriptions, &user.Subscription{
				BaseURL: s.config.BaseURL,
				Topic:   topic,
			})
		}
		if err := s.userManager.ChangeSettings(newUser.ID, prefs); err != nil {
			return err
		}
	}
	return s.writeJSON(w, newSuccessResponse())
}

// apiInviteJoinResponse is the response for joining via invite as an existing user
type apiInviteJoinResponse struct {
	Success bool     `json:"success"`
	Topics  []string `json:"topics"`
}

// handleInviteJoin allows an authenticated user to join topics via an invite token
func (s *Server) handleInviteJoin(w http.ResponseWriter, r *http.Request, v *visitor) error {
	path := strings.TrimPrefix(r.URL.Path, "/v1/invite/")
	token := strings.TrimSuffix(path, "/join")
	if token == "" {
		return errHTTPBadRequestInviteInvalid
	}
	inv, err := s.lookupInvite(token)
	if err != nil {
		return err
	}
	// Atomically increment used_count to prevent race condition (TOCTOU)
	db := s.messageCache.DB()
	result, err := db.Exec(
		`UPDATE invites SET used_count = used_count + 1 WHERE token = ? AND used_count < max_uses`,
		token,
	)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return errHTTPBadRequestInviteMaxUsed
	}
	u := v.User()
	username := u.Name
	// Grant access to topics
	var topics []string
	if inv.Topics != "" {
		for _, topic := range strings.Split(inv.Topics, ",") {
			topic = strings.TrimSpace(topic)
			if topic != "" {
				if err := s.userManager.AllowAccess(username, topic, user.PermissionReadWrite); err != nil {
					return err
				}
				topics = append(topics, topic)
			}
		}
	}
	// Add topics as account subscriptions so they appear in the user's sidebar
	if len(topics) > 0 {
		prefs := u.Prefs
		if prefs == nil {
			prefs = &user.Prefs{}
		}
		for _, topic := range topics {
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
			}
		}
		if err := s.userManager.ChangeSettings(u.ID, prefs); err != nil {
			return err
		}
	}
	return s.writeJSON(w, &apiInviteJoinResponse{
		Success: true,
		Topics:  topics,
	})
}

// lookupInvite retrieves an invite by token and validates it is still usable
func (s *Server) lookupInvite(token string) (*invite, error) {
	db := s.messageCache.DB()
	inv := &invite{}
	err := db.QueryRow(
		`SELECT token, created_by, topics, max_uses, used_count, expires_at, created_at FROM invites WHERE token = ?`,
		token,
	).Scan(&inv.Token, &inv.CreatedBy, &inv.Topics, &inv.MaxUses, &inv.UsedCount, &inv.ExpiresAt, &inv.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, errHTTPBadRequestInviteNotFound
	} else if err != nil {
		return nil, err
	}
	now := time.Now().Unix()
	if inv.ExpiresAt > 0 && inv.ExpiresAt < now {
		return nil, errHTTPBadRequestInviteExpired
	}
	if inv.UsedCount >= inv.MaxUses {
		return nil, errHTTPBadRequestInviteMaxUsed
	}
	return inv, nil
}
