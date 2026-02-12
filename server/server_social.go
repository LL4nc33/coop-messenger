package server

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"

	"heckel.io/ntfy/v2/log"
	"heckel.io/ntfy/v2/user"
)

const (
	tagSocial         = "social"
	typingRateLimit   = 3 * time.Second
	nudgeRateLimit    = 30 * time.Second
	rateLimitCleanup  = 5 * time.Minute
	coopTypingEvent   = "coop_typing"
	coopNudgeEvent    = "coop_nudge"
)

// socialRateLimiter tracks per-user-per-topic rate limits for typing and nudge events
type socialRateLimiter struct {
	mu    sync.Mutex
	items map[string]int64 // key: "event:username:topic" -> unix timestamp
}

func newSocialRateLimiter() *socialRateLimiter {
	rl := &socialRateLimiter{
		items: make(map[string]int64),
	}
	go rl.cleanupLoop()
	return rl
}

func (rl *socialRateLimiter) Allow(event, username, topic string, interval time.Duration) bool {
	key := event + ":" + username + ":" + topic
	now := time.Now().Unix()
	rl.mu.Lock()
	defer rl.mu.Unlock()
	if last, ok := rl.items[key]; ok && now-last < int64(interval.Seconds()) {
		return false
	}
	rl.items[key] = now
	return true
}

func (rl *socialRateLimiter) cleanupLoop() {
	for {
		time.Sleep(rateLimitCleanup)
		rl.mu.Lock()
		now := time.Now().Unix()
		for k, v := range rl.items {
			if now-v > 300 { // 5 minutes
				delete(rl.items, k)
			}
		}
		rl.mu.Unlock()
	}
}

type apiTypingRequest struct {
	Topic string `json:"topic"`
}

type apiNudgeRequest struct {
	Topic string `json:"topic"`
}

// handleTypingEvent handles POST /v1/coop/typing
// Sends a transient typing event to topic subscribers (not stored in DB)
func (s *Server) handleTypingEvent(w http.ResponseWriter, r *http.Request, v *visitor) error {
	u := v.User()
	body, err := io.ReadAll(io.LimitReader(r.Body, 4096))
	if err != nil {
		return err
	}
	var req apiTypingRequest
	if err := json.Unmarshal(body, &req); err != nil {
		return errHTTPBadRequest.Wrap("invalid request body")
	}
	if req.Topic == "" {
		return errHTTPBadRequest.Wrap("topic required")
	}

	// Check read access to topic
	if err := s.userManager.Authorize(u, req.Topic, user.PermissionRead); err != nil {
		return errHTTPForbidden
	}

	// Rate limit
	if !s.socialRateLimiter.Allow(coopTypingEvent, u.Name, req.Topic, typingRateLimit) {
		return s.writeJSON(w, newSuccessResponse())
	}

	// Get or create the topic object and publish a transient event
	t, err := s.topicFromID(req.Topic)
	if err != nil {
		return err
	}

	m := newMessage(coopTypingEvent, req.Topic, "")
	m.SenderName = u.Name
	if err := t.Publish(v, m); err != nil {
		return err
	}

	return s.writeJSON(w, newSuccessResponse())
}

// handleNudge handles POST /v1/coop/nudge
// Sends a nudge message that is stored in DB and streamed to subscribers
func (s *Server) handleNudge(w http.ResponseWriter, r *http.Request, v *visitor) error {
	u := v.User()
	body, err := io.ReadAll(io.LimitReader(r.Body, 4096))
	if err != nil {
		return err
	}
	var req apiNudgeRequest
	if err := json.Unmarshal(body, &req); err != nil {
		return errHTTPBadRequest.Wrap("invalid request body")
	}
	if req.Topic == "" {
		return errHTTPBadRequest.Wrap("topic required")
	}

	// Check write access
	if err := s.userManager.Authorize(u, req.Topic, user.PermissionWrite); err != nil {
		return errHTTPForbidden
	}

	// Rate limit: 1 nudge per 30s per user per topic
	if !s.socialRateLimiter.Allow(coopNudgeEvent, u.Name, req.Topic, nudgeRateLimit) {
		return errHTTPTooManyRequests.Wrap("nudge rate limit exceeded (max 1 per 30s)")
	}

	// Get the topic
	t, err := s.topicFromID(req.Topic)
	if err != nil {
		return err
	}

	// Create nudge message (stored like a regular message)
	m := newMessage(coopNudgeEvent, req.Topic, "")
	m.SenderName = u.Name
	m.Sender = v.IP()
	m.User = v.MaybeUserID()
	m.Expires = time.Unix(m.Time, 0).Add(v.Limits().MessageExpiryDuration).Unix()

	// Publish to subscribers
	if err := t.Publish(v, m); err != nil {
		return err
	}

	// Store in DB
	if err := s.messageCache.AddMessage(m); err != nil {
		return err
	}

	log.Tag(tagSocial).Info("Nudge sent by %s in topic %s", u.Name, req.Topic)
	return s.writeJSON(w, map[string]string{
		"id":    m.ID,
		"event": coopNudgeEvent,
	})
}

// handleSlashCommand handles POST /v1/coop/commands
// Executes server-side slash commands
func (s *Server) handleSlashCommand(w http.ResponseWriter, r *http.Request, v *visitor) error {
	u := v.User()
	body, err := io.ReadAll(io.LimitReader(r.Body, 4096))
	if err != nil {
		return err
	}
	var req struct {
		Command string `json:"command"`
		Topic   string `json:"topic"`
		Args    string `json:"args"`
	}
	if err := json.Unmarshal(body, &req); err != nil {
		return errHTTPBadRequest.Wrap("invalid request body")
	}

	switch req.Command {
	case "gurr":
		// Nudge via slash command - delegate to nudge handler with the target topic
		if req.Topic == "" {
			return errHTTPBadRequest.Wrap("topic required for /gurr")
		}
		// Check write access
		if err := s.userManager.Authorize(u, req.Topic, user.PermissionWrite); err != nil {
			return errHTTPForbidden
		}
		if !s.socialRateLimiter.Allow(coopNudgeEvent, u.Name, req.Topic, nudgeRateLimit) {
			return errHTTPTooManyRequests.Wrap("nudge rate limit exceeded")
		}
		t, err := s.topicFromID(req.Topic)
		if err != nil {
			return err
		}
		m := newMessage(coopNudgeEvent, req.Topic, "")
		m.SenderName = u.Name
		m.Sender = v.IP()
		m.User = v.MaybeUserID()
		m.Expires = time.Unix(m.Time, 0).Add(v.Limits().MessageExpiryDuration).Unix()
		if err := t.Publish(v, m); err != nil {
			return err
		}
		if err := s.messageCache.AddMessage(m); err != nil {
			return err
		}
		return s.writeJSON(w, map[string]string{"result": "nudge_sent"})

	case "status":
		// Set user bio/status
		if req.Args == "" {
			return errHTTPBadRequest.Wrap("status text required")
		}
		if len(req.Args) > 200 {
			return errHTTPBadRequest.Wrap("status too long (max 200)")
		}
		profile, err := s.userManager.ProfileByUserID(u.ID)
		if err != nil {
			return err
		}
		if err := s.userManager.UpdateProfile(u.ID, profile.DisplayName, req.Args); err != nil {
			return err
		}
		return s.writeJSON(w, map[string]string{"result": "status_updated", "bio": req.Args})

	case "flieg":
		// Leave topic - remove access
		if req.Topic == "" {
			return errHTTPBadRequest.Wrap("topic required for /flieg")
		}
		if strings.HasPrefix(req.Topic, "dm_") {
			return errHTTPBadRequest.Wrap("cannot leave DM topics")
		}
		if err := s.userManager.ResetAccess(u.Name, req.Topic); err != nil {
			return err
		}
		return s.writeJSON(w, map[string]string{"result": "left_topic", "topic": req.Topic})

	default:
		return errHTTPBadRequest.Wrap("unknown command: " + req.Command)
	}
}
