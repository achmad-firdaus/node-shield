# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Node Shield** is a production-grade runtime protection library for Node.js applications. It detects and blocks 8 types of security attacks in real-time with minimal performance overhead. It's designed as:
- A zero-client-code-change middleware (works transparently)
- A standalone HTTP server with real-time dashboard
- An npm package for Express.js and other frameworks
- A Docker container for containerized deployments

**Portfolio angle:** Demonstrates security expertise, system design, and full-stack execution (detection logic + frontend dashboard + DevOps).

## Architecture

### Core Attack Detection Engine (`shield.js`)

The `NodeShield` class is the heart of the system. It:

1. **Detects 8 attack types** using pattern matching:
   - SQL Injection: keywords like `UNION`, `SELECT`, `--`, `'`, `;`
   - RCE: patterns like `eval()`, `require()`, `child_process`, `exec()`
   - Path Traversal: `..` and `../` sequences
   - Command Injection: shell metacharacters `|`, `&`, `;`, `$`, `` ` ``
   - XSS: `<script>`, `javascript:`, event handlers
   - NoSQL Injection: NoSQL keywords and JSON patterns
   - XXE: XML entity patterns
   - LDAP Injection: LDAP-specific keywords

2. **Logs attacks** with metadata:
   - Auto-incremented ID (`timestamp-counter`)
   - Attack type, endpoint, payload (truncated to 200 chars)
   - Client IP (extracted from headers or socket)
   - Severity level (CRITICAL → HIGH → MEDIUM → LOW)
   - Details as JSON

3. **Tracks IP rates** for brute force detection:
   - Maintains `ipRates` object tracking count, first-seen time, and attack types per IP
   - Triggers rate-limit alert if >5 attacks in 10 seconds

4. **Dual storage modes**:
   - **PostgreSQL** (when `DB_HOST` env var is set): Uses connection pool to persist attacks
   - **In-memory** (fallback): Stores in `inMemoryAttacks` array; useful for development/testing
   - Automatically falls back to in-memory if DB connection fails

### Server Implementations

**Two server modes exist:**

1. **app-standalone.js** (HTTP server)
   - Uses Node.js native `http` module
   - Mounts a pre-built dashboard HTML file (`dashboard-as400pro.html`)
   - Handles request parsing and attack checks inline
   - Serves API endpoints (`/api/attacks`, `/api/stats`, `/api/count`, `/api/reset`)
   - Caches dashboard HTML to avoid disk reads

2. **app.js** (Express.js)
   - Uses Express middleware pattern
   - Demonstrates integration with a real framework
   - Includes mock vulnerable endpoints for testing
   - Cleaner API structure

Both check query/body parameters against all 8 detection methods before passing requests through.

### Database Schema

**Location: `migrations/001_initial_schema.sql`**

Managed via `npm run migrate`. Single table `attacks` with columns:
- `id` (TEXT PRIMARY KEY): timestamp-counter format
- `timestamp` (TIMESTAMP): when attack occurred
- `type` (VARCHAR 50): attack type (SQL Injection, RCE, etc.)
- `endpoint` (VARCHAR 255): request path
- `payload` (TEXT): truncated attack payload
- `ip` (INET): attacker's IP address
- `blocked` (BOOLEAN): always true (for future use)
- `severity` (VARCHAR 20): CRITICAL, HIGH, MEDIUM, LOW
- `details` (JSONB): attack metadata
- `created_at` (TIMESTAMP): server insertion time

Indexes on `timestamp`, `ip`, `type`, `severity`, `created_at` for query performance.

### Dashboard

**File: `dashboard-as400pro.html`**

Standalone HTML file with embedded JavaScript. Features:
- Auto-refreshes every 2-3 seconds via `/api/attacks` polling
- Multi-tab UI: Attacks (paginated), Attackers (IP stats), Stats (counters)
- Dark retro theme (AS400 styling for portfolio differentiation)
- Mobile responsive
- No external dependencies (all CSS/JS inline)

Dashboard queries:
- `/api/attacks?page=1&limit=100`: Paginated attack list
- `/api/stats`: Aggregated statistics (counts by type, severity, top IPs)
- `/api/count`: Total attack count for pagination

## Common Development Tasks

### Run Locally (In-Memory)
```bash
npm start
# or
PORT=3000 npm start
# Opens dashboard at http://localhost:3000
```
No database required; uses in-memory storage.

### Run with PostgreSQL (Docker)
```bash
docker-compose up
# Starts postgres + node-shield
# Automatically runs migrations on startup
# Dashboard at http://localhost:3001
```

### Run Migrations Manually
```bash
# Apply all pending migrations
npm run migrate

# With custom DB connection
DB_HOST=localhost DB_USER=shield_user npm run migrate
```

### Test Attack Scenarios
```bash
PORT=3000 npm start
# In another terminal, try:
curl "http://localhost:3000/?q=admin' UNION SELECT 1--"    # SQL Injection
curl "http://localhost:3000/?cmd=require('child_process')" # RCE
curl "http://localhost:3000/?file=../../etc/passwd"        # Path Traversal
curl "http://localhost:3000/?input=<script>alert(1)</script>" # XSS
```

### Access Dashboard APIs
```bash
curl http://localhost:3000/api/attacks         # All logged attacks
curl http://localhost:3000/api/stats           # Aggregated stats
curl -X POST http://localhost:3000/api/reset   # Clear logs
```

### Run CLI
```bash
node cli.js stats      # Show statistics
node cli.js attacks    # Show recent attacks
node cli.js reset      # Clear logs
node cli.js export     # Export to JSON
```

## Key Files & Responsibilities

| File | Purpose |
|------|---------|
| `shield.js` | Core `NodeShield` class with all detection logic and logging |
| `app-standalone.js` | HTTP server demo; main entry point for `npm start` |
| `app.js` | Express.js integration example |
| `index.js` | npm package entry point; exports `NodeShield` + helpers |
| `cli.js` | Command-line interface for stats, attacks, reset, export |
| `dashboard-as400pro.html` | Frontend UI with embedded JS/CSS |
| `init.sql` | PostgreSQL schema initialization |
| `docker-compose.yml` | Multi-service setup (postgres + node-shield) |
| `Dockerfile` | Container image definition |

## Important Implementation Details

### Detection Patterns

All detection methods in `shield.js` use simple case-insensitive substring matching. This is intentional:
- **Pro:** Fast, no regex complexity, catches most attacks
- **Con:** High false positive rate (e.g., "select" in email addresses)
- Future: ML-based detection for nuance

### Severity Mapping

Defined in `calculateSeverity()`:
```
RCE → CRITICAL
XXE → HIGH
SQL Injection → HIGH
NoSQL Injection → HIGH
Command Injection → HIGH
LDAP Injection → MEDIUM
Path Traversal → MEDIUM
XSS → LOW
```

### IP Rate Limiting

Brute force detection happens during `logAttack()`:
- If an IP sends >5 attacks within 10 seconds, console logs `[CRITICAL] ... (RATE LIMITED)`
- Currently logging-only; future feature could auto-block

### Database Failover

If PostgreSQL is unavailable:
1. `shield.pool.on('error')` triggers
2. `useInMemoryDB` flag is set to `true`
3. All subsequent `logAttack()` calls store in `inMemoryAttacks`
4. Data is not lost, but not persisted across restarts

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `DB_HOST` | (none) | PostgreSQL host; if unset, uses in-memory mode |
| `DB_PORT` | 5432 | PostgreSQL port |
| `DB_NAME` | node_shield | Database name |
| `DB_USER` | shield_user | PostgreSQL user |
| `DB_PASSWORD` | shield_password | PostgreSQL password |
| `NODE_ENV` | development | Set to `production` in docker-compose |
| `PORT` | 3000 | HTTP server port |

## Testing & Validation

**Current status:** Basic manual testing with curl commands.

**To add:**
- Unit tests for each detection method (false positive/negative rates)
- Integration tests with actual SQL/NoSQL queries
- Performance benchmarks
- Dashboard E2E tests

**Test file location:** `test.js` exists but should be expanded.

## Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure `DB_*` environment variables for persistent storage
- [ ] Use docker-compose for multi-service setup or standalone for single-machine
- [ ] Test dashboard and APIs are accessible
- [ ] Verify attack logs persist across restarts (if using DB)
- [ ] Set up monitoring for `/api/stats` (optional)
- [ ] Document custom detection rules if added

## Known Limitations & TODOs

1. **No request body scanning** — Only query parameters checked
2. **Pattern-based detection** — Prone to false positives (e.g., "select" in text)
3. **No request rate limiting** — Only IP tracking, no automatic blocking
4. **Dashboard polling-based** — Not real-time WebSocket (acceptable for MVP)
5. **Single attack table** — No partitioning for long-term data retention
6. **No authentication** — Dashboard is public by default

## Migration System

Simple file-based migrations without external dependencies.

### How It Works

1. **Migration files** in `migrations/` directory (numbered: `001_*.sql`, `002_*.sql`, etc.)
2. **Tracking table** (`migrations`) records which migrations have been applied
3. **migrate.js** script reads all `.sql` files, checks which are pending, and applies them in order
4. **Idempotent:** Safe to run multiple times; tracks applied migrations in DB

### Using Migrations

```bash
# Apply all pending migrations
npm run migrate

# View status
npm run migrate

# Docker automatically runs migrations on startup
docker-compose up
```

### Adding a New Migration

1. Create file in `migrations/` with next number:
   ```
   migrations/002_add_request_body_column.sql
   ```

2. Write SQL:
   ```sql
   -- 002_add_request_body_column.sql
   ALTER TABLE attacks ADD COLUMN request_body TEXT;
   ```

3. Run migrations:
   ```bash
   npm run migrate
   ```

The script will automatically detect and apply only new migrations.

## Notes for Future Work

- Dashboard HTML is monolithic (55KB); consider splitting if it grows
- In-memory attack array has no size limit; add cleanup for long-running processes
- `ipRates` object persists forever; add TTL-based cleanup
- CLI export uses `fs.writeFileSync` (blocking); async version preferred for production
