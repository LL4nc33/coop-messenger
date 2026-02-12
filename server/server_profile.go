package server

import (
	"crypto/rand"
	"encoding/hex"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"heckel.io/ntfy/v2/log"
	"heckel.io/ntfy/v2/user"
)

const (
	avatarMaxSize    = 512 * 1024 // 512 KB
	avatarIDPrefix   = "av_"
	avatarIDRandLen  = 12
	avatarDirName    = "avatars"
	tagProfile       = "profile"
)

var avatarAllowedTypes = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
	"image/gif":  ".gif",
}

func (s *Server) avatarDir() string {
	if s.config.AttachmentCacheDir == "" {
		return ""
	}
	return filepath.Join(s.config.AttachmentCacheDir, avatarDirName)
}

func generateAvatarID() string {
	b := make([]byte, avatarIDRandLen/2)
	rand.Read(b)
	return avatarIDPrefix + hex.EncodeToString(b)
}

// handleAvatarUpload handles PUT /v1/coop/profile/avatar
func (s *Server) handleAvatarUpload(w http.ResponseWriter, r *http.Request, v *visitor) error {
	u := v.User()
	if u == nil {
		return errHTTPForbidden
	}
	dir := s.avatarDir()
	if dir == "" {
		return errHTTPBadRequest.Wrap("avatar uploads not configured")
	}
	if err := os.MkdirAll(dir, 0700); err != nil {
		return err
	}

	// Limit body to avatarMaxSize
	r.Body = http.MaxBytesReader(w, r.Body, avatarMaxSize)

	// Parse multipart form
	if err := r.ParseMultipartForm(avatarMaxSize); err != nil {
		return errHTTPBadRequest.Wrap("file too large (max 512 KB)")
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		return errHTTPBadRequest.Wrap("missing file field")
	}
	defer file.Close()

	// Validate content type
	contentType := header.Header.Get("Content-Type")
	ext, ok := avatarAllowedTypes[contentType]
	if !ok {
		return errHTTPBadRequest.Wrap("invalid file type, allowed: jpeg, png, webp, gif")
	}

	// Generate avatar ID and save
	avatarID := generateAvatarID()
	filename := avatarID + ext
	destPath := filepath.Join(dir, filename)

	dest, err := os.OpenFile(destPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0600)
	if err != nil {
		return err
	}
	defer dest.Close()

	if _, err := io.Copy(dest, file); err != nil {
		os.Remove(destPath)
		return err
	}

	// Delete old avatar if exists
	oldAvatarID, err := s.userManager.ProfileAvatarID(u.ID)
	if err == nil && oldAvatarID != "" {
		s.deleteAvatarFile(dir, oldAvatarID)
	}

	// Update DB
	if err := s.userManager.UpdateProfileAvatar(u.ID, filename); err != nil {
		os.Remove(destPath)
		return err
	}

	logvr(v, r).Tag(tagProfile).Info("Avatar uploaded for user %s", u.Name)
	return s.writeJSON(w, map[string]string{
		"avatar_url": "/v1/coop/profile/avatar/" + filename,
	})
}

// handleAvatarGet handles GET /v1/coop/profile/avatar/{avatarId}
func (s *Server) handleAvatarGet(w http.ResponseWriter, r *http.Request, v *visitor) error {
	dir := s.avatarDir()
	if dir == "" {
		return errHTTPNotFound
	}

	// Parse avatar ID from path
	avatarID := strings.TrimPrefix(r.URL.Path, "/v1/coop/profile/avatar/")
	if avatarID == "" || strings.Contains(avatarID, "/") || strings.Contains(avatarID, "..") {
		return errHTTPNotFound
	}

	filePath := filepath.Join(dir, avatarID)
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return errHTTPNotFound
	}

	// Detect content type from extension
	ext := filepath.Ext(avatarID)
	contentType := "application/octet-stream"
	switch ext {
	case ".jpg", ".jpeg":
		contentType = "image/jpeg"
	case ".png":
		contentType = "image/png"
	case ".webp":
		contentType = "image/webp"
	case ".gif":
		contentType = "image/gif"
	}

	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", "public, max-age=86400")
	http.ServeFile(w, r, filePath)
	return nil
}

// handleAvatarDelete handles DELETE /v1/coop/profile/avatar
func (s *Server) handleAvatarDelete(w http.ResponseWriter, r *http.Request, v *visitor) error {
	u := v.User()
	if u == nil {
		return errHTTPForbidden
	}
	dir := s.avatarDir()
	if dir == "" {
		return s.writeJSON(w, newSuccessResponse())
	}

	// Get current avatar
	oldAvatarID, err := s.userManager.ProfileAvatarID(u.ID)
	if err == nil && oldAvatarID != "" {
		s.deleteAvatarFile(dir, oldAvatarID)
	}

	// Clear in DB
	if err := s.userManager.UpdateProfileAvatar(u.ID, ""); err != nil {
		return err
	}

	logvr(v, r).Tag(tagProfile).Info("Avatar deleted for user %s", u.Name)
	return s.writeJSON(w, newSuccessResponse())
}

// deleteAvatarFile removes an avatar file from disk
func (s *Server) deleteAvatarFile(dir, avatarID string) {
	if avatarID == "" {
		return
	}
	filePath := filepath.Join(dir, avatarID)
	if err := os.Remove(filePath); err != nil && !os.IsNotExist(err) {
		log.Tag(tagProfile).Err(err).Warn("Failed to delete avatar file %s", filePath)
	}
}

// handleProfileGet handles GET /v1/coop/profile (own profile)
func (s *Server) handleProfileGet(w http.ResponseWriter, r *http.Request, v *visitor) error {
	u := v.User()
	if u == nil {
		return errHTTPForbidden
	}
	profile, err := s.userManager.Profile(u.Name)
	if err != nil {
		return err
	}
	return s.writeJSON(w, profile)
}

// handleProfileUpdate handles PATCH /v1/coop/profile (update own profile)
func (s *Server) handleProfileUpdate(w http.ResponseWriter, r *http.Request, v *visitor) error {
	u := v.User()
	if u == nil {
		return errHTTPForbidden
	}

	req, err := readJSONWithLimit[apiProfileUpdateRequest](r.Body, jsonBodyBytesLimit, false)
	if err != nil {
		return err
	}

	// Get current profile to merge with updates
	profile, err := s.userManager.ProfileByUserID(u.ID)
	if err != nil {
		return err
	}

	displayName := profile.DisplayName
	bio := profile.Bio
	if req.DisplayName != nil {
		displayName = *req.DisplayName
		if len(displayName) > 50 {
			return errHTTPBadRequest.Wrap("display_name too long (max 50)")
		}
	}
	if req.Bio != nil {
		bio = *req.Bio
		if len(bio) > 200 {
			return errHTTPBadRequest.Wrap("bio too long (max 200)")
		}
	}

	if err := s.userManager.UpdateProfile(u.ID, displayName, bio); err != nil {
		return err
	}

	logvr(v, r).Tag(tagProfile).Info("Profile updated for user %s", u.Name)
	// Return updated profile
	updated, err := s.userManager.Profile(u.Name)
	if err != nil {
		return err
	}
	return s.writeJSON(w, updated)
}

// handleProfileGetByUsername handles GET /v1/coop/profile/{username}
func (s *Server) handleProfileGetByUsername(w http.ResponseWriter, r *http.Request, v *visitor) error {
	u := v.User()
	if u == nil {
		return errHTTPForbidden
	}
	username := strings.TrimPrefix(r.URL.Path, "/v1/coop/profile/")
	if username == "" || username == "avatar" {
		return errHTTPNotFound
	}
	profile, err := s.userManager.Profile(username)
	if err != nil {
		return errHTTPNotFound
	}
	return s.writeJSON(w, profile)
}

// handleProfilesByTopic handles GET /v1/coop/profiles?topic={topicName}
func (s *Server) handleProfilesByTopic(w http.ResponseWriter, r *http.Request, v *visitor) error {
	u := v.User()
	if u == nil {
		return errHTTPForbidden
	}
	topic := r.URL.Query().Get("topic")
	if topic == "" {
		return errHTTPBadRequest.Wrap("topic parameter required")
	}
	// Check user has read access to topic
	if err := s.userManager.Authorize(u, topic, user.PermissionRead); err != nil {
		return errHTTPForbidden
	}
	profiles, err := s.userManager.ProfilesByTopic(topic)
	if err != nil {
		return err
	}
	return s.writeJSON(w, profiles)
}

// apiProfileUpdateRequest is the request for PATCH /v1/coop/profile
type apiProfileUpdateRequest struct {
	DisplayName *string `json:"display_name,omitempty"`
	Bio         *string `json:"bio,omitempty"`
}
