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

### v0.0.1.1 — Foundation ✅
- Forked ntfy v2.17.0 as base
- Chat-oriented UI with message bubbles (own vs. others)
- Neobrutalism design system (Space Grotesk, DM Sans, JetBrains Mono)
- German i18n (en.json as single source)

### v0.0.1.2 — Invite System ✅
- Invite creation, redemption, link sharing
- DB migration 14→15 (sender_name + invites table)

### v0.0.1.3 — Access Control & Admin ✅
- Join request system (request → approve/deny)
- Admin Panel (Users, Chats + Join Requests, Invites)
- `auth-default-access: deny-all` as default
- DB migration 15→16 (join_requests table)

### v0.0.1.4 — UX & Polish ✅
- Welcome dashboard, theme toggle (light/dark), accent colors
- Chat-ID sharing, auto-generated chat IDs
- SubscribeDialog, in-app documentation

### v0.0.1.5 — UX Quick Wins ✅
- Smart auto-scroll, chat sorting by activity
- Unread badges, date separators, send feedback
- Mobile drawer auto-close

### v0.0.1.6 — Rich Messages ✅
- Reply/quote system, emoji reactions (👍❤️😂😮😢🔥)
- Inline image/video/audio previews, lightbox
- Link previews, markdown rendering
- DB migration 16→17 (reactions table + reply fields)

---

## Phase 3 — Messenger Identity

> Coop soll sich anfühlen wie ein richtiger Messenger, nicht wie ein Notification-Tool.

### v0.0.1.7 — User Profiles ✅
- [x] User avatars (upload/delete, display in bubbles + sidebar)
- [x] Display name (editable, separate from username)
- [x] User bio/status ("Verfügbar", "Beschäftigt", custom text)
- [x] "Zuletzt online" indicator (online/recently/offline)
- [x] Member list per chat (slide-out drawer with People icon)
- [x] Profile page/modal (click on avatar → see profile, edit own)
- [x] DB migration 6→7 in user.db (user_profile table: display_name, bio, avatar_id, last_seen)

### v0.0.1.8 — Group Chat UX
- [ ] Group names and descriptions (editable by creator/admin)
- [ ] Group avatars
- [ ] "XY hat die Gruppe erstellt" system messages
- [ ] "XY ist beigetreten / hat verlassen" events
- [ ] Group admin roles (creator can add/remove members)
- [ ] Direct Messages (1:1 chats, auto-created, separate from groups)
- [ ] Contact list / user search within the same server

### v0.0.1.9 — Notifications & PWA
- [ ] Web Push Notifications (service worker, VAPID)
- [ ] Notification sounds (customizable)
- [ ] Per-chat notification settings (mute, mention-only)
- [ ] PWA install prompt (Add to Home Screen banner)
- [ ] Offline message queue (send when back online)
- [ ] Background sync

---

## Phase 4 — Security & Encryption

> Coop wird sicherer als Telegram. Nicht mal der Server-Admin kann mitlesen.

### v0.0.2.0 — Security Hardening
- [ ] TOTP Two-Factor Authentication (QR code setup, backup codes)
- [ ] Session management UI (see active sessions, revoke)
- [ ] Account lockout after N failed login attempts
- [ ] SQLCipher (encrypted database at-rest)
- [ ] Content Security Policy headers
- [ ] HSTS, X-Frame-Options, security headers
- [ ] Rate limiting improvements
- [ ] Password strength requirements

### v0.0.2.1 — End-to-End Encryption (E2E Light)
- [ ] Client-side keypair generation (ECDH, WebCrypto / e2ee.js)
- [ ] Public key storage on server (new DB table + API endpoints)
- [ ] Private key stored in browser IndexedDB (non-exportable)
- [ ] 1:1 message encryption (encrypt before send, decrypt on receive)
- [ ] Group encryption (message encrypted N times, once per member)
- [ ] 🔒 Lock icon on encrypted messages
- [ ] Key export/import (QR code for multi-device)
- [ ] "Verschlüsselt — nur du und dein Chatpartner können diese Nachricht lesen"
- [ ] Unencrypted fallback for clients that don't support E2E yet

### v0.0.2.2 — E2E Advanced (optional, later)
- [ ] Double Ratchet Protocol (Forward Secrecy via 2key-ratchet)
- [ ] Key verification (Safety Numbers / emoji comparison)
- [ ] Encrypted key backup on server
- [ ] Automatic session rotation
- [ ] Disappearing messages (auto-delete timer)

---

## Phase 5 — Native Apps

> Download → Registrieren auf chatcoop.at → Chatten. Wie WhatsApp.

### v0.0.3.0 — App Shell (Capacitor)
- [ ] Capacitor project setup (wrap existing React PWA)
- [ ] Native push notifications (FCM for Android, APNs for iOS)
- [ ] App icon and splash screen (Neobrutalism pigeon logo)
- [ ] Deep linking (coop://chat/xxx, https://chatcoop.at/invite/xxx)
- [ ] Biometric unlock (fingerprint/face)
- [ ] Background message fetch

### v0.0.3.1 — Android Release
- [ ] F-Droid build pipeline (reproducible builds, no proprietary deps)
- [ ] F-Droid metadata and repository submission
- [ ] Google Play Store listing ($25 one-time fee)
- [ ] APK download from chatcoop.at
- [ ] Android-specific: notification channels, share intent

### v0.0.3.2 — iOS Release
- [ ] Apple Developer Program ($99/year, when user base justifies it)
- [ ] iOS-specific: haptic feedback, share extensions
- [ ] TestFlight beta distribution
- [ ] App Store submission
- [ ] Fallback: PWA "Add to Home Screen" bleibt immer verfügbar

---

## Phase 6 — Hub & Onboarding

> chatcoop.at wird der Default-Server. Jeder kann mitmachen, ohne was zu hosten.

### v0.0.4.0 — chatcoop.at Hub Server
- [ ] Production deployment (VPS in EU, Austrian/German hosting)
- [ ] Landing page: "Coop — Dein privater Messenger"
- [ ] Public registration (rate-limited, captcha)
- [ ] Terms of Service, Privacy Policy (DSGVO-konform)
- [ ] Abuse reporting system
- [ ] Admin dashboard for hub operations
- [ ] Monitoring, backups, uptime

### v0.0.4.1 — Onboarding Flow
- [ ] App-first experience: Download → Server-Auswahl (chatcoop.at als Default) → Registrieren → Los
- [ ] QR-Code invite system (scan to join chat/server)
- [ ] Contact discovery (optional: phone number or email matching)
- [ ] "Freunde einladen" share sheet (WhatsApp/Telegram/SMS/Email)
- [ ] Setup wizard for self-hosters (browser-based, 3 steps)
- [ ] One-click deploy templates (DigitalOcean, Hetzner, Railway)

---

## Phase 7 — Federation

> Alle Coop-Server reden miteinander. Wie Email, aber mit Verschlüsselung.

### v0.0.5.0 — Federation Protocol
- [ ] User identity format: `@username@server.tld`
- [ ] Server-to-server authentication (mutual TLS or signed requests)
- [ ] DNS-based server discovery (SRV records or .well-known)
- [ ] Message routing: HTTP-based relay between servers
- [ ] Federated user lookup (search users across servers)

### v0.0.5.1 — Federated Messaging
- [ ] Cross-server 1:1 messages
- [ ] Cross-server group chats (one server hosts, others participate)
- [ ] E2E encryption across federation (keys exchanged directly between clients)
- [ ] Delivery receipts and read status across servers
- [ ] Offline message queuing between servers

### v0.0.5.2 — Federation Management
- [ ] Server allowlist/blocklist (admin chooses who to federate with)
- [ ] Spam prevention (server reputation, rate limits)
- [ ] chatcoop.at as federation hub (default peer for new servers)
- [ ] Server directory (public list of Coop instances)
- [ ] Federation health dashboard

---

## Phase 8 — Polish & Scale

> Von "es funktioniert" zu "es ist richtig gut".

### v0.1.0 — Feature Parity
- [ ] Voice messages (record + send audio)
- [ ] Typing indicators ("XY schreibt...")
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
