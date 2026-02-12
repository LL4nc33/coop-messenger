# Coop Messenger — Roadmap to v1.0

> **Vision:** Coop wird die einfachste, privateste Messenger-Alternative zu WhatsApp.
> Download → Registrieren → Chatten. Kein Server-Setup nötig.
> Wer will, hostet selbst. Alle Server reden miteinander.
>
> **Hub:** `chatcoop.at` — der offizielle Coop-Server für alle.
> **Self-Hosted:** Docker auf Raspberry Pi, VPS, oder eigener Hardware.
> **Federation:** Alle Coop-Instanzen verbinden sich zu einem Netzwerk.
>
> Developed entirely AI-assisted using [Claude Code](https://claude.ai/claude-code).

---

## Completed

### v0.0.1.0 — Foundation ✅
- Forked ntfy v2.17.0 as base
- Chat-oriented UI with message bubbles (own vs. others)
- Neobrutalism design system (Space Grotesk, DM Sans, JetBrains Mono)
- German i18n (en.json as single source, 550+ keys)
- Configurable accent color (4 presets + custom picker)
- Dark mode throughout (CSS variables, no hardcoded colors)
- SQLite migration 14→15 (sender_name + invites table)
- 6 critical bugs fixed (cache persistence, invite flow, auth redirect)

### v0.0.1.1 — Messenger Feeling ✅
- Removed PublishDialog (949 lines dead code) — ChatInput only
- Chat list with message preview + timestamp (WhatsApp-style)
- Simplified SubscribeDialog (no reserve/server toggle, auto-ID)
- 3-stage theme toggle (Light→Dark→System)

### v0.0.1.2 — Invite System & Visual Polish ✅
- Invite creation, redemption, link sharing
- Join request system (request → approve/deny)
- Admin Panel (Users, Chats + Join Requests, Invites)
- Pixel-art pigeon logo (favicon, PWA, og:image, sidebar)
- Shadow system with theme-independent shadow color
- DB migration 15→16 (join_requests table)

### v0.0.1.3 — Welcome & Sharing ✅
- Welcome dashboard with recent chat cards
- Chat-ID sharing (Share API + clipboard fallback)
- Own messages no longer trigger notifications/unread badges

### v0.0.1.4 — UX & Documentation ✅
- In-app documentation (User + Admin tabs)
- `auth-default-access: deny-all` as default
- README, CONTRIBUTING, LICENSE (AGPLv3)

### v0.0.1.5 — UX Quick Wins ✅
- Smart auto-scroll, chat sorting by activity
- Unread badges, date separators, send feedback
- Mobile drawer auto-close

### v0.0.1.6 — Rich Messages ✅
- Reply/quote system, emoji reactions (👍❤️😂😮😢🔥)
- Inline image/video/audio previews, lightbox
- Link previews, markdown rendering
- DB migration 16→17 (reactions table + reply fields)

### v0.0.1.7 — User Profiles ✅
- User avatars (upload/delete, display in bubbles + sidebar)
- Display name (editable, separate from username)
- User bio/status ("Verfügbar", "Beschäftigt", custom text)
- "Zuletzt online" indicator (online/recently/offline)
- Member list per chat (slide-out drawer with People icon)
- Profile modal (click on avatar → see profile, edit own)
- DB migration 6→7 in user.db (user_profile table)

### v0.0.1.8 — Contacts & DMs ✅
- Contact system (search, add, accept/reject/block)
- Direct messages (1:1 chats with random hex topic IDs)
- Group creation (name + members → group with topic_meta)
- Privacy settings (open / request-only / invite-only)
- DB migration 7→8 in user.db (user_contact, topic_meta, privacy)
- DB migration 8→9 in user.db (dm_user_a/dm_user_b in topic_meta)

### v0.0.1.9 — Social & Fun ✅
- Typing indicator ("XY pickt..." with animation, 3s rate limit)
- Nudge/poke system (shake animation, yellow bubble, 30s rate limit)
- Slash commands (/gurr, /status, /flieg, /mitglieder)
- Command palette (autocomplete dropdown, keyboard navigation)
- 5 security fixes (SQL injection, goroutine leak, auth check, ReDoS)

### v0.0.2.0 — UX Audit Fixes ✅
- GroupCreate button in navigation (feature was unreachable)
- Avatar pipeline: own profile picture in ActionBar + sidebar
- DM navigation fix (useNavigate instead of window.location.hash)
- Neobrutalism consistency (shadows, borders, hover states)

### v0.0.2.1 — Chat Polish ✅
- Message grouping (WhatsApp-style, 5-min window, compact groups)
- Removed gray separator lines between messages (CSS fix)
- Standard channels: coop-klatsch, coop-tech (all users)

### v0.0.2.2 — Subscription Bug Fix ✅
- Auto-subscription for DM recipients (chat appears in sidebar automatically)
- Auto-subscription for group members on group creation
- Auto-subscription on admin access grant (both endpoints)
- Reply/emoji buttons overlay fix (no overlap with next message)

---

## Phase 3 — Security & Release

> Coop wird stabil und sicher genug für erste echte Nutzer.

### v0.0.3.0 — Release Readiness
- [ ] Invite race condition fix (TOCTOU in server_invite.go)
- [ ] NULL pointer check in ensureAdmin middleware
- [ ] Container as non-root user (Dockerfile-coop)
- [ ] Health check in docker-compose
- [ ] Security headers (CSP, HSTS, X-Frame-Options)
- [ ] CORS restrictions (instead of wildcard)
- [ ] Password policy server-side (min 8 chars)
- [ ] rehype-sanitize for markdown (prevent stored XSS)

### v0.0.3.1 — Attachments & Media
- [ ] Attachment button in ChatInput (paperclip icon)
- [ ] Drag & drop files into chat
- [ ] Paste images from clipboard
- [ ] Upload progress indicator
- [ ] File size limits and type validation

### v0.0.3.2 — Notifications & PWA
- [ ] Web Push Notifications (service worker, VAPID)
- [ ] Notification sounds (customizable)
- [ ] Per-chat notification settings (mute, mention-only)
- [ ] PWA install prompt (Add to Home Screen banner)
- [ ] Unread counter in browser tab
- [ ] Offline message queue (send when back online)

---

## Phase 4 — Security & Encryption

> Coop wird sicherer als Telegram. Nicht mal der Server-Admin kann mitlesen.

### v0.0.4.0 — Security Hardening
- [ ] TOTP Two-Factor Authentication (QR code setup, backup codes)
- [ ] Session management UI (see active sessions, revoke)
- [ ] Account lockout after N failed login attempts
- [ ] SQLCipher (encrypted database at-rest)
- [ ] Rate limiting improvements

### v0.0.4.1 — End-to-End Encryption (E2E Light)
- [ ] Client-side keypair generation (ECDH, WebCrypto / e2ee.js)
- [ ] Public key storage on server (new DB table + API endpoints)
- [ ] Private key stored in browser IndexedDB (non-exportable)
- [ ] 1:1 message encryption (encrypt before send, decrypt on receive)
- [ ] Group encryption (message encrypted N times, once per member)
- [ ] 🔒 Lock icon on encrypted messages
- [ ] Key export/import (QR code for multi-device)
- [ ] Unencrypted fallback for clients that don't support E2E yet

### v0.0.4.2 — E2E Advanced (optional, later)
- [ ] Double Ratchet Protocol (Forward Secrecy via 2key-ratchet)
- [ ] Key verification (Safety Numbers / emoji comparison)
- [ ] Encrypted key backup on server
- [ ] Automatic session rotation
- [ ] Disappearing messages (auto-delete timer)

---

## Phase 5 — Native Apps

> Download → Registrieren auf chatcoop.at → Chatten. Wie WhatsApp.

### v0.0.5.0 — App Shell (Capacitor)
- [ ] Capacitor project setup (wrap existing React PWA)
- [ ] Native push notifications (FCM for Android, APNs for iOS)
- [ ] App icon and splash screen (Neobrutalism pigeon logo)
- [ ] Deep linking (coop://chat/xxx, https://chatcoop.at/invite/xxx)
- [ ] Biometric unlock (fingerprint/face)
- [ ] Background message fetch

### v0.0.5.1 — Android Release
- [ ] F-Droid build pipeline (reproducible builds, no proprietary deps)
- [ ] Google Play Store listing
- [ ] APK download from chatcoop.at
- [ ] Android-specific: notification channels, share intent

### v0.0.5.2 — iOS Release
- [ ] Apple Developer Program (when user base justifies it)
- [ ] iOS-specific: haptic feedback, share extensions
- [ ] TestFlight beta distribution
- [ ] App Store submission
- [ ] Fallback: PWA "Add to Home Screen" bleibt immer verfügbar

---

## Phase 6 — Hub & Onboarding

> chatcoop.at wird der Default-Server. Jeder kann mitmachen, ohne was zu hosten.

### v0.0.6.0 — chatcoop.at Hub Server
- [ ] Production deployment (VPS in EU, Austrian/German hosting)
- [ ] Landing page: "Coop — Dein privater Messenger"
- [ ] Public registration (rate-limited, captcha)
- [ ] Terms of Service, Privacy Policy (DSGVO-konform)
- [ ] Abuse reporting system
- [ ] Admin dashboard for hub operations
- [ ] Monitoring, backups, uptime

### v0.0.6.1 — Onboarding Flow
- [ ] App-first experience: Download → Server-Auswahl → Registrieren → Los
- [ ] QR-Code invite system (scan to join chat/server)
- [ ] Contact discovery (optional: phone number or email matching)
- [ ] "Freunde einladen" share sheet (WhatsApp/Telegram/SMS/Email)
- [ ] Setup wizard for self-hosters (browser-based, 3 steps)
- [ ] One-click deploy templates (DigitalOcean, Hetzner, Railway)

---

## Phase 7 — Federation

> Alle Coop-Server reden miteinander. Wie Email, aber mit Verschlüsselung.

### v0.0.7.0 — Federation Protocol
- [ ] User identity format: `@username@server.tld`
- [ ] Server-to-server authentication (mutual TLS or signed requests)
- [ ] DNS-based server discovery (SRV records or .well-known)
- [ ] Message routing: HTTP-based relay between servers
- [ ] Federated user lookup (search users across servers)

### v0.0.7.1 — Federated Messaging
- [ ] Cross-server 1:1 messages
- [ ] Cross-server group chats (one server hosts, others participate)
- [ ] E2E encryption across federation
- [ ] Delivery receipts and read status across servers
- [ ] Offline message queuing between servers

### v0.0.7.2 — Federation Management
- [ ] Server allowlist/blocklist
- [ ] Spam prevention (server reputation, rate limits)
- [ ] chatcoop.at as federation hub (default peer for new servers)
- [ ] Server directory (public list of Coop instances)

---

## Phase 8 — Polish & Scale

> Von "es funktioniert" zu "es ist richtig gut".

### v0.1.0 — Feature Parity
- [ ] Voice messages (record + send audio)
- [ ] Read receipts (✓✓ blue checkmarks)
- [ ] Message editing (within 15 minutes)
- [ ] Message deletion (for self / for everyone)
- [ ] Message search (full-text search within chats)
- [ ] Pin messages in chats
- [ ] File sharing improvements (drag & drop, previews for PDFs)
- [ ] Multi-language support (English, German to start)

### v0.2.0 — Media & Communication
- [ ] Voice calls (WebRTC, 1:1)
- [ ] Video calls (WebRTC, 1:1)
- [ ] Group calls (WebRTC, SFU)
- [ ] Screen sharing
- [ ] Stories/Status (24h content, like WhatsApp Status)
- [ ] Sticker packs (custom, community-created)

### v0.3.0 — Platform & Ecosystem
- [ ] Bot API (for integrations, automations)
- [ ] Webhook support (connect external services)
- [ ] Desktop app (Electron or Tauri, wrapping web UI)
- [ ] Themes marketplace (community Neobrutalism themes)
- [ ] Plugin system (extend Coop with custom features)

---

## v1.0 — The WhatsApp Alternative 🐦

**Coop v1.0 means:**

- ✅ Download app → register → chat (no server setup needed)
- ✅ End-to-end encrypted (not even the server can read your messages)
- ✅ Self-hostable (your server, your data, your rules)
- ✅ Federated (all Coop servers talk to each other)
- ✅ Available on Android (F-Droid + Play Store), iOS, Web, Desktop
- ✅ Voice & video calls
- ✅ Feature parity with WhatsApp for daily use
- ✅ DSGVO-konform, EU-hosted, open source
- ✅ chatcoop.at as the official hub for everyone

**Tagline:** *"Dein Messenger. Dein Server. Dein Taubenschlag."*

---

## Business Model (planned)

Coop is and will always be **free and open source**.

Revenue options for sustainability:
- **chatcoop.at Premium:** Free tier (generous limits) → Paid tier for extra storage, larger groups, priority support
- **Managed Hosting:** "Coop für deine Schule/Firma" — we host, you use
- **Support & Consulting:** Enterprise support contracts
- **Donations:** Open Collective, GitHub Sponsors

Self-hosting remains free forever. No features locked behind paywalls.

---

## What Changed from ntfy

| Area | ntfy | Coop |
|------|------|------|
| Purpose | Push notifications | Private messenger |
| UI | Notification list | Chat bubbles |
| Access | Open by default | Invite-only + public registration |
| Security | Transport only | E2E encrypted |
| Network | Single server | Federated |
| Apps | ntfy Android/iOS | Coop Android/iOS/Desktop |
| Design | Material standard | Neobrutalism |
| Default server | ntfy.sh | chatcoop.at |
| Target | Developers | Everyone |
