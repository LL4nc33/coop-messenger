package server

import (
	"net/http"
	"strings"
	"time"

	"heckel.io/ntfy/v2/user"
)

// apiReactionRequest is the request body for adding a reaction
type apiReactionRequest struct {
	Emoji string `json:"emoji"`
}

// apiReactionGroup represents a grouped reaction in API responses
type apiReactionGroup struct {
	Emoji   string   `json:"emoji"`
	Count   int      `json:"count"`
	Users   []string `json:"users"`
	Reacted bool     `json:"reacted"`
}

// handleReactionAdd adds or toggles a reaction on a message (authenticated user)
func (s *Server) handleReactionAdd(w http.ResponseWriter, r *http.Request, v *visitor) error {
	// Parse path: /v1/coop/messages/{messageId}/reactions
	pathParts := strings.Split(strings.TrimPrefix(r.URL.Path, "/v1/coop/messages/"), "/")
	if len(pathParts) < 2 || pathParts[0] == "" {
		return errHTTPBadRequest.Wrap("invalid message ID")
	}
	messageID := pathParts[0]

	req, err := readJSONWithLimit[apiReactionRequest](r.Body, jsonBodyBytesLimit, false)
	if err != nil {
		return err
	}
	if req.Emoji == "" {
		return errHTTPBadRequest.Wrap("emoji is required")
	}

	// Look up message to get topic for authorization
	msg, err := s.messageCache.Message(messageID)
	if err != nil {
		return errHTTPNotFound
	}

	// Authorize user for the topic
	u := v.User()
	if err := s.userManager.Authorize(u, msg.Topic, user.PermissionRead); err != nil {
		return errHTTPForbidden
	}

	username := u.Name
	now := time.Now().Unix()
	db := s.messageCache.DB()

	// Toggle: try to delete first, if nothing deleted then insert
	result, err := db.Exec(
		`DELETE FROM reactions WHERE message_id = ? AND username = ? AND emoji = ?`,
		messageID, username, req.Emoji,
	)
	if err != nil {
		return err
	}
	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		// Reaction didn't exist, insert it
		if _, err := db.Exec(
			`INSERT INTO reactions (message_id, topic, username, emoji, created_at) VALUES (?, ?, ?, ?, ?)`,
			messageID, msg.Topic, username, req.Emoji, now,
		); err != nil {
			return err
		}
	}

	return s.writeJSON(w, newSuccessResponse())
}

// handleReactionList lists reactions for a message
func (s *Server) handleReactionList(w http.ResponseWriter, r *http.Request, v *visitor) error {
	// Parse path: /v1/coop/messages/{messageId}/reactions
	pathParts := strings.Split(strings.TrimPrefix(r.URL.Path, "/v1/coop/messages/"), "/")
	if len(pathParts) < 2 || pathParts[0] == "" {
		return errHTTPBadRequest.Wrap("invalid message ID")
	}
	messageID := pathParts[0]

	// Look up message to get topic for authorization
	msg, err := s.messageCache.Message(messageID)
	if err != nil {
		return errHTTPNotFound
	}

	// Authorize user for the topic
	u := v.User()
	if err := s.userManager.Authorize(u, msg.Topic, user.PermissionRead); err != nil {
		return errHTTPForbidden
	}

	// Get requesting user's name (for "reacted" field)
	requestingUser := ""
	if u != nil {
		requestingUser = u.Name
	}

	db := s.messageCache.DB()
	rows, err := db.Query(
		`SELECT emoji, username FROM reactions WHERE message_id = ? ORDER BY created_at ASC`,
		messageID,
	)
	if err != nil {
		return err
	}
	defer rows.Close()

	// Group reactions by emoji
	emojiMap := make(map[string]*apiReactionGroup)
	emojiOrder := make([]string, 0)
	for rows.Next() {
		var emoji, username string
		if err := rows.Scan(&emoji, &username); err != nil {
			return err
		}
		group, exists := emojiMap[emoji]
		if !exists {
			group = &apiReactionGroup{Emoji: emoji, Users: make([]string, 0)}
			emojiMap[emoji] = group
			emojiOrder = append(emojiOrder, emoji)
		}
		group.Users = append(group.Users, username)
		group.Count++
		if username == requestingUser {
			group.Reacted = true
		}
	}
	if err := rows.Err(); err != nil {
		return err
	}

	// Build ordered result
	result := make([]*apiReactionGroup, 0, len(emojiOrder))
	for _, emoji := range emojiOrder {
		result = append(result, emojiMap[emoji])
	}

	return s.writeJSON(w, result)
}

// handleReactionDelete removes a user's reaction from a message
func (s *Server) handleReactionDelete(w http.ResponseWriter, r *http.Request, v *visitor) error {
	// Parse path: /v1/coop/messages/{messageId}/reactions/{emoji}
	trimmed := strings.TrimPrefix(r.URL.Path, "/v1/coop/messages/")
	pathParts := strings.SplitN(trimmed, "/", 3)
	if len(pathParts) < 3 || pathParts[0] == "" || pathParts[2] == "" {
		return errHTTPBadRequest.Wrap("invalid path")
	}
	messageID := pathParts[0]
	emoji := pathParts[2]

	// Look up message to get topic for authorization
	msg, err := s.messageCache.Message(messageID)
	if err != nil {
		return errHTTPNotFound
	}

	// Authorize user for the topic
	u := v.User()
	if err := s.userManager.Authorize(u, msg.Topic, user.PermissionRead); err != nil {
		return errHTTPForbidden
	}

	username := u.Name
	db := s.messageCache.DB()
	result, err := db.Exec(
		`DELETE FROM reactions WHERE message_id = ? AND username = ? AND emoji = ?`,
		messageID, username, emoji,
	)
	if err != nil {
		return err
	}
	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return errHTTPNotFound
	}

	return s.writeJSON(w, newSuccessResponse())
}

// handleReactionsByTopic returns all reactions for messages in a topic (for bulk loading)
func (s *Server) handleReactionsByTopic(w http.ResponseWriter, r *http.Request, v *visitor) error {
	topic := r.URL.Query().Get("topic")
	if topic == "" {
		return errHTTPBadRequest.Wrap("topic parameter is required")
	}

	// Authorize user for the topic
	u := v.User()
	if err := s.userManager.Authorize(u, topic, user.PermissionRead); err != nil {
		return errHTTPForbidden
	}

	requestingUser := ""
	if u != nil {
		requestingUser = u.Name
	}

	db := s.messageCache.DB()
	rows, err := db.Query(
		`SELECT message_id, emoji, username FROM reactions WHERE topic = ? ORDER BY message_id, created_at ASC`,
		topic,
	)
	if err != nil {
		return err
	}
	defer rows.Close()

	// Group by message_id -> emoji
	type messageReactions struct {
		MessageID string              `json:"message_id"`
		Reactions []*apiReactionGroup `json:"reactions"`
	}

	msgMap := make(map[string]map[string]*apiReactionGroup)
	msgOrder := make([]string, 0)
	for rows.Next() {
		var msgID, emoji, username string
		if err := rows.Scan(&msgID, &emoji, &username); err != nil {
			return err
		}
		if _, exists := msgMap[msgID]; !exists {
			msgMap[msgID] = make(map[string]*apiReactionGroup)
			msgOrder = append(msgOrder, msgID)
		}
		group, exists := msgMap[msgID][emoji]
		if !exists {
			group = &apiReactionGroup{Emoji: emoji, Users: make([]string, 0)}
			msgMap[msgID][emoji] = group
		}
		group.Users = append(group.Users, username)
		group.Count++
		if username == requestingUser {
			group.Reacted = true
		}
	}
	if err := rows.Err(); err != nil {
		return err
	}

	result := make([]*messageReactions, 0, len(msgOrder))
	for _, msgID := range msgOrder {
		groups := make([]*apiReactionGroup, 0)
		for _, g := range msgMap[msgID] {
			groups = append(groups, g)
		}
		result = append(result, &messageReactions{MessageID: msgID, Reactions: groups})
	}

	return s.writeJSON(w, result)
}

