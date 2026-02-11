# Contributing to Coop Messenger

Thanks for your interest in contributing to Coop! This document covers the basics of how to get involved.

## How to Contribute

### Reporting Bugs

- Open a [GitHub Issue](https://github.com/LL4nc33/coop-messenger/issues) with a clear description
- Include steps to reproduce, expected behavior, and actual behavior
- Add screenshots if relevant (especially for UI issues)
- Mention your browser, OS, and whether you're using Docker or a native build

### Suggesting Features

- Open a [GitHub Issue](https://github.com/LL4nc33/coop-messenger/issues) with the `enhancement` label
- Describe the use case and why the feature would be useful
- For larger features, please discuss first before implementing

### Pull Requests

1. Fork the repository
2. Create a feature branch from `main`: `git checkout -b feat/my-feature`
3. Make your changes
4. Test locally (Docker build + manual testing)
5. Submit a PR with a clear description of what changed and why

## Development Setup

### Prerequisites

- Go 1.24+
- Node.js 18+
- Make
- Docker & Docker Compose

### Quick Start

```bash
# Clone your fork
git clone https://github.com/LL4nc33/coop-messenger.git
cd coop-messenger

# Build and run with Docker
docker compose up -d --build

# Or use the Vite dev server for frontend changes
cd web
npm install
npx vite --port 3001
```

### Project Structure

```
coop-messenger/
  config/           # Server configuration (server.yml)
  server/           # Go backend
    server.go       # Main server + routing
    server_invite.go    # Invite system endpoints
    server_join_request.go  # Join request endpoints
    message_cache.go    # SQLite schema + migrations
  web/
    src/
      app/          # Core logic (API, DB, Session, i18n)
      components/   # React components
      css/          # Neobrutalism design system (coop.css)
    public/
      static/langs/ # i18n files (en.json = German translations)
  Dockerfile-coop   # Docker build file
  docker-compose.yml
```

### Key Conventions

- **i18n**: `en.json` contains German text (the app's primary language). Use `t("key", "Deutscher Fallback")` -- both must be German.
- **ASCII Umlauts**: Use `ae/oe/ue/ss` instead of real umlauts in source code.
- **Design**: Follow the Neobrutalism design system in `coop.css` (bold borders, sharp corners, accent colors).
- **Fonts**: Space Grotesk (headings), DM Sans (body), JetBrains Mono (code/IDs).

### Testing

Currently, Coop relies on manual testing. After making changes:

1. Build: `docker compose down && docker compose up -d --build`
2. Hard-refresh the browser: `Ctrl+Shift+R` (Service Worker caches aggressively)
3. Test both admin and regular user flows

## Code Style

- **Go**: Standard Go formatting (`gofmt`)
- **JavaScript/JSX**: No strict linter configured yet; follow existing patterns
- **Commits**: Clear, descriptive commit messages in English

## License

By contributing, you agree that your contributions will be licensed under the [AGPL-3.0 License](LICENSE).
