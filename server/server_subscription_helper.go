package server

import (
	"heckel.io/ntfy/v2/log"
	"heckel.io/ntfy/v2/user"
)

const tagSubscription = "subscription"

// addSubscriptionsForUser adds topics to a user's Prefs.Subscriptions so they appear in the sidebar.
// It deduplicates existing subscriptions. The user needs to refresh the page or reconnect
// to see the new subscriptions (sync events for other users are not yet supported).
// This is used when granting access to a user from DM creation, group creation, or admin endpoints.
func (s *Server) addSubscriptionsForUser(username string, topics []string) error {
	if len(topics) == 0 {
		return nil
	}

	u, err := s.userManager.User(username)
	if err != nil {
		return err
	}

	prefs := u.Prefs
	if prefs == nil {
		prefs = &user.Prefs{}
	}

	added := false
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
			added = true
		}
	}

	if !added {
		return nil
	}

	if err := s.userManager.ChangeSettings(u.ID, prefs); err != nil {
		return err
	}

	log.Tag(tagSubscription).Info("Added subscriptions for user %s: %v", username, topics)
	return nil
}
