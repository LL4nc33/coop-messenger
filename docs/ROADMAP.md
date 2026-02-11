# Coop Messenger -- Roadmap

> This roadmap reflects the current vision and priorities. It is subject to change.

## Version History

### v0.1.0 -- Foundation (completed)
- Forked ntfy v2.17.0 as base
- Replaced notification-centric UI with chat-oriented design
- Built ChatView with message bubbles (own vs. others)
- Built ChatInput with Enter-to-send / Shift+Enter for newlines
- Redesigned Navigation sidebar with chat list
- Created Neobrutalism design system (coop.css)
- Switched fonts to Space Grotesk, DM Sans, JetBrains Mono
- Rewrote all i18n to German (en.json as single source)

### v0.2.0 -- Invite System (completed)
- Invite creation (admin): topics, max uses, expiry
- Invite link page: registration form for new users
- Invite list and deletion in Admin Panel
- DB migration 14 -> 15 (sender_name + invites table)

### v0.3.0 -- Access Control & Admin (completed)
- Invite join for existing users (logged-in users can accept invites)
- Join request system (users request access, admins approve/deny)
- Admin Panel with 3 tabs: Users, Chats + Join Requests, Invites
- DB migration 15 -> 16 (join_requests table)
- `auth-default-access: deny-all` as default configuration

### v0.4.0 -- UX & Polish (current)
- Welcome/dashboard page with chat cards and greeting
- Theme toggle (light/dark) with configurable accent colors
- Notification fix: own messages don't trigger notifications or unread badges
- Chat-ID sharing (native share API + clipboard fallback)
- SubscribeDialog with "Create Chat" and "Join Chat" tabs
- Auto-generated chat IDs for new chats
- Invite links auto-subscribe users to topics
- In-app documentation page (user + admin tabs)

---

## Upcoming

### v0.5.0 -- UX Quick Wins
- [ ] Mobile drawer auto-close after navigation
- [ ] Chat sorting by most recent activity
- [ ] Smart auto-scroll (only when at bottom)
- [ ] Unread message highlighting in chat list
- [ ] Date separators in chat view
- [ ] Send feedback (animation/sound)
- [ ] Typing indicators (stretch goal)

### v0.6.0 -- Rich Messages
- [ ] Image/media previews in chat
- [ ] Link previews with metadata
- [ ] Markdown support in messages
- [ ] Message reactions
- [ ] Reply/quote messages

### v0.7.0 -- User Profiles
- [ ] User avatars (upload + display)
- [ ] User status/bio
- [ ] "Last seen" indicator
- [ ] Member list per chat

### v0.8.0 -- Mobile App Integration
- [ ] Custom ntfy-android fork with Coop UI
- [ ] Push notification improvements
- [ ] Offline message queue

---

## Long-Term Vision

### Federation (exploring)

The ultimate goal for Coop is to become a **cooperative messaging network**:

- **Cross-server communication**: Users on `chat.alice.com` can message users on `chat.bob.com`
- **Server discovery**: A central registry or DNS-based discovery for Coop instances
- **Hub server**: An official Coop instance as a default entry point (like `matrix.org` for Matrix)
- **API gateway**: Servers act as relays, routing messages to the correct destination

This is inspired by how email works (anyone can run a mail server, but they all interoperate) and how Matrix federation works. It's an ambitious goal that requires careful protocol design.

**Open questions:**
- Message routing protocol (HTTP-based? Custom protocol?)
- Identity verification across servers
- End-to-end encryption across federated servers
- Spam prevention between instances
- Message delivery guarantees

Contributions and ideas for federation are especially welcome.

---

## What Changed from ntfy

Coop started as a fork of ntfy v2.17.0. Here's what's different:

| Area | ntfy | Coop |
|------|------|------|
| Purpose | Push notifications | Private messaging |
| UI | Notification list | Chat bubbles |
| Access | Open by default | Invite-only |
| User management | Basic | Invites + join requests |
| Admin | User list only | Full admin panel |
| Design | Material standard | Neobrutalism |
| i18n | Multi-language | German-first |
| Home page | All notifications | Welcome dashboard |
| Subscriptions | Manual topic entry | Auto-generated chat IDs |
| API | Unchanged | Extended with invite/join endpoints |
