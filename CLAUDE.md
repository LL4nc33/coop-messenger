# Coop Messenger - Claude Code Konfiguration

## Sprache
- Kommunikation: Deutsch
- Code-Kommentare: Englisch
- ASCII-Umlaute im Sourcecode (ae/oe/ue/ss)

## Delegation (CWE Agents)
Nutze die CWE-Agents AKTIV fuer spezialisierte Aufgaben:
- **cwe:builder** - Implementation, Bug Fixes, Code-Aenderungen
- **cwe:security** - Security Audits, Vulnerability Checks
- **cwe:quality** - Tests, Coverage, Quality Metrics
- **cwe:researcher** - Codebase-Analyse, Dokumentation
- **cwe:architect** - System-Design, ADRs, API-Design
- **cwe:ask** - Fragen beantworten, Code erklaeren (READ-ONLY)

Parallelisiere unabhaengige Tasks ueber mehrere Agents wo moeglich.

## Code-Stil
- Bestehende Funktionen VERWENDEN und BEARBEITEN statt neu schreiben
- Vorhandene Patterns im Code folgen (siehe server_*.go fuer Backend-Handler)
- i18n: `t("key", "Deutscher Fallback")` - beide Werte muessen Deutsch sein
- en.json ist die Fallback-Sprache und enthaelt direkt Deutsch

## Build & Test
```bash
docker compose down && DOCKER_BUILDKIT=1 docker build --network=host -f Dockerfile-coop -t oidanice-coop-coop . && docker compose up -d
```
- Nach Build: Ctrl+Shift+R im Browser (Service Worker Cache)
- Credentials: siehe lokale Memory-Dateien (nicht im Repo!)

## Dokumentation
PFLICHT: Nach jeder Session ALLE 7 Dateien aktualisieren:
- `README.md` - **OEFFENTLICHE README auf GitHub** (Englisch, Features aktuell, Version-Badge!)
- `docs/ROADMAP.md` - **OEFFENTLICHE Roadmap im Repo** (Englisch, konsistente vX.Y.Z Tags, Checkboxen aktuell!)
- `memory/changelog.md` - Neue Version mit Added/Changed/Fixed eintragen
- `memory/kanban.md` - Tasks verschieben (DONE/IN PROGRESS/TODO)
- `memory/roadmap.md` - Interne Roadmap (Deutsch, Details)
- `memory/status.md` - Aktuellen Stand dokumentieren
- `memory/MEMORY.md` - Architektur-Aenderungen eintragen
