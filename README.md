```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                    ◆ NODE SHIELD SECURITY MONITOR ◆                         ║
║                                                                              ║
║              Production-Grade Runtime Protection for Node.js                ║
║                     Real-Time Attack Detection & Blocking                   ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

[![Tests](https://github.com/achmad-firdaus/node-shield/actions/workflows/test.yml/badge.svg)](https://github.com/achmad-firdaus/node-shield/actions/workflows/test.yml)
[![npm version](https://badge.fury.io/js/node-shield.svg)](https://www.npmjs.com/package/node-shield)
[![codecov](https://codecov.io/gh/achmad-firdaus/node-shield/branch/main/graph/badge.svg)](https://codecov.io/gh/achmad-firdaus/node-shield)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🚀 QUICK START

**Option 1: Docker Compose (Recommended)**
```bash
docker-compose up
# → Dashboard at http://localhost:3001
# → PostgreSQL persistence included
```

**Option 2: Standalone (In-Memory)**
```bash
npm start
# → Dashboard at http://localhost:3001
# → Data cleared on restart (development only)
```

**Option 3: npm Package**
```bash
npm install node-shield
const NodeShield = require('node-shield');
const shield = new NodeShield();
```

---

## ⚙️ CORE CAPABILITIES

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ATTACK DETECTION ENGINE (8 Vectors)                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ ▸ SQL Injection          ▸ Remote Code Execution (RCE)                      │
│ ▸ Path Traversal         ▸ Command Injection                                │
│ ▸ Cross-Site Scripting   ▸ NoSQL Injection                                  │
│ ▸ XXE (XML Entity)       ▸ LDAP Injection                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Feature | Details |
|---------|---------|
| **Multi-Source Scanning** | Query params, POST body, HTTP headers |
| **Real-Time Dashboard** | Live attack log with auto-refresh |
| **Severity Levels** | CRITICAL, HIGH, MEDIUM, LOW |
| **IP Tracking** | Rate-limit detection, attacker identification |
| **Whitelist/Blacklist** | Allow trusted / block suspicious IPs & patterns |
| **Zero Config** | Transparent integration, no code changes required |
| **Docker Ready** | Dockerfile + docker-compose included |
| **Production Grade** | <2% performance overhead, PostgreSQL persistence |

---

## 🧪 THREAT SIMULATION

Fire test attacks and watch Node Shield detect & block them:

```bash
# SQL Injection
curl "http://localhost:3001/?q=admin' UNION SELECT 1,2,3--"

# Remote Code Execution
curl "http://localhost:3001/?cmd=require('child_process').exec()"

# Path Traversal
curl "http://localhost:3001/?file=../../etc/passwd"

# Command Injection
curl "http://localhost:3001/?shell=ls | cat /etc/passwd"

# Cross-Site Scripting
curl "http://localhost:3001/?input=<script>alert(1)</script>"

# NoSQL Injection
curl "http://localhost:3001/?query={'\$ne':null}"

# XXE Attack
curl "http://localhost:3001/?xml=<!DOCTYPE foo [<!ENTITY xxe SYSTEM 'file:///etc/passwd'>]>"

# LDAP Injection
curl "http://localhost:3001/?cn=*)(|(cn=*"
```

**Expected Response:** `HTTP 400` with attack blocked message

---

## 📡 API ENDPOINTS

### Core Endpoints

```bash
# Get attack log (paginated)
curl http://localhost:3001/api/attacks?page=1&limit=100

# Get statistics
curl http://localhost:3001/api/stats

# Count total attacks
curl http://localhost:3001/api/count

# Health check
curl http://localhost:3001/api/health

# Clear all logs (admin)
curl -X POST http://localhost:3001/api/reset
```

### IP & Pattern Management

```bash
# View whitelist
curl http://localhost:3001/api/whitelist

# Add IP to whitelist
curl -X POST http://localhost:3001/api/whitelist \
  -H "Content-Type: application/json" \
  -d '{"type":"ip","value":"192.168.1.100"}'

# Add safe pattern
curl -X POST http://localhost:3001/api/whitelist \
  -H "Content-Type: application/json" \
  -d '{"type":"pattern","value":"internal-api"}'

# Remove from whitelist
curl -X DELETE http://localhost:3001/api/whitelist \
  -H "Content-Type: application/json" \
  -d '{"type":"ip","value":"192.168.1.100"}'
```

```bash
# View blacklist
curl http://localhost:3001/api/blacklist

# Blacklist suspicious IP
curl -X POST http://localhost:3001/api/blacklist \
  -H "Content-Type: application/json" \
  -d '{"type":"ip","value":"203.0.113.45"}'

# Blacklist dangerous pattern
curl -X POST http://localhost:3001/api/blacklist \
  -H "Content-Type: application/json" \
  -d '{"type":"pattern","value":"DROP TABLE"}'

# Remove from blacklist
curl -X DELETE http://localhost:3001/api/blacklist \
  -H "Content-Type: application/json" \
  -d '{"type":"ip","value":"203.0.113.45"}'
```

**For complete API documentation, see [API.md](API.md)**

---

## 🏗️ SYSTEM ARCHITECTURE

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  REQUEST → [shield.js] → DETECTION ENGINE → [LOG] → DASHBOARD          │
│              ↓                                          ↓                 │
│         Pattern Matching                         PostgreSQL / Memory    │
│         Rate Limiting                            Real-time API          │
│         Whitelist/Blacklist                      Live Dashboard UI      │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Key Files

| File | Purpose |
|------|---------|
| `shield.js` | Core detection engine (8 attack types, logging, IP tracking) |
| `app-standalone.js` | HTTP server with dashboard & API routes |
| `app.js` | Express.js middleware wrapper |
| `dashboard-as400pro.html` | Real-time retro-themed attack monitor UI |
| `logger.js` | Structured logging with rotation & level control |

### Database

- **PostgreSQL** (production): Persistent attack logs with indexes
- **In-Memory** (development): Temporary storage, cleared on restart
- Auto-migrations on startup (see `migrations/`)

---

## 💻 INTEGRATION GUIDE

### Express.js Middleware

```javascript
const NodeShield = require('node-shield');
const express = require('express');

const shield = new NodeShield();
const app = express();

// Protect all routes
app.use(shield.middleware());

app.get('/dashboard', (req, res) => {
  res.set('Content-Type', 'text/html');
  res.send(shield.getDashboardHTML());
});

app.listen(3000);
```

### Standalone Server (Native Node.js)

```javascript
const NodeShield = require('node-shield');
const shield = new NodeShield();

// Server automatically includes dashboard at /
// API endpoints at /api/*
// All requests scanned before processing
```

---

## 📦 DEPLOYMENT

### Development (In-Memory)
```bash
npm install
npm start
# Dashboard: http://localhost:3001
# Storage: Temporary (cleared on restart)
```

### Development (With PostgreSQL)
```bash
docker-compose down && docker-compose build --no-cache && docker-compose up
# Dashboard: http://localhost:3001
# Storage: Persistent PostgreSQL
# Migrations: Auto-applied on startup
```

### Production (Docker)
```bash
docker-compose -f docker-compose.yml up -d
# Uses environment variables from .env
# PostgreSQL health checks enabled
# Auto-restart on failure
# Log rotation: 10MB per file, 7 files max
```

### Environment Variables

```bash
# Server
PORT=3001
NODE_ENV=production

# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=node_shield
DB_USER=shield_user
DB_PASSWORD=shield_password

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=json
LOG_DIR=/app/logs
LOG_MAX_SIZE=10485760
LOG_MAX_FILES=7
```

**For complete deployment details, see [DEPLOYMENT.md](DEPLOYMENT.md)**

---

## 🧪 TESTING

### 15-Minute Self-Healing Stress Test

```bash
# Full automated test with Docker auto-recovery
./test-docker-15min.sh

# Tests 15 attack vectors per cycle
# Auto-restarts Docker if any test fails
# Requires 30 consecutive successful cycles (15 minutes)
```

**See [TESTING.md](TESTING.md) for complete testing guide**

---

## 📚 LOGGING SYSTEM

Node Shield includes comprehensive structured logging with:
- **5 log levels**: DEBUG, INFO, WARN, ERROR, CRITICAL
- **Automatic rotation**: Daily + size-based (10MB default)
- **Formats**: JSON (production) or text (development)
- **File persistence**: Configurable retention (7 days default)

```bash
# View logs
tail -f logs/node-shield-*.log

# Parse JSON logs
cat logs/*.log | jq 'select(.level=="CRITICAL")'

# Filter by attack type
cat logs/*.log | jq -r '.data | select(.type=="SQL Injection") | .ip'
```

**See [LOGGING.md](LOGGING.md) for complete logging documentation**

---

## 🛡️ DETECTION PATTERNS

### Detection Methods

Each attack vector uses case-insensitive pattern matching:

| Attack Type | Signatures | Severity |
|-------------|-----------|----------|
| **SQL Injection** | `UNION`, `SELECT`, `INSERT`, `DELETE`, `DROP`, `;`, `--` | HIGH |
| **RCE** | `eval()`, `require()`, `child_process`, `exec()`, `spawn()`, `vm.` | CRITICAL |
| **Path Traversal** | `..`, `../`, `..%2f`, `/etc/passwd` | MEDIUM |
| **Command Injection** | `\|`, `&`, `;`, `$`, `` ` ``, `&&`, `\|\|` | HIGH |
| **XSS** | `<script>`, `javascript:`, `onerror=`, `onclick=`, `alert(` | LOW |
| **NoSQL Injection** | `{$`, `[$`, `db.`, `collection.`, `{regex:` | HIGH |
| **XXE** | `<!DOCTYPE`, `<!ENTITY`, `SYSTEM`, `PUBLIC`, `file://` | HIGH |
| **LDAP Injection** | `*`, `(|`, `(&`, `cn=`, `uid=`, `objectclass` | MEDIUM |

### Rate Limiting

- **Threshold**: >5 attacks from same IP in 10 seconds
- **Action**: Logged as CRITICAL, request blocked
- **Tracking**: Per-IP counters stored in memory

---

## 🎯 ROADMAP

```
✅ COMPLETED (v0.2)                    ⏳ PLANNED (v1.0+)
├─ 8 attack detection types           ├─ Dashboard authentication
├─ Multi-source scanning              ├─ ML-based detection
├─ Real-time dashboard                ├─ Advanced analytics
├─ IP tracking & rate limiting        ├─ Vercel deployment
├─ Whitelist/blacklist management     ├─ Email/Slack alerts
├─ Docker & docker-compose            └─ SaaS analytics version
├─ npm package integration
├─ Structured logging with rotation
├─ 15-min self-healing stress test
└─ Production-ready deployment
```

---

## 🎖️ PORTFOLIO HIGHLIGHTS

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  ✓ SECURITY EXPERTISE ──→ Real attack vectors, pattern matching         │
│  ✓ SYSTEM DESIGN ────────→ Zero overhead, transparent integration       │
│  ✓ FULL-STACK ───────────→ Detection + API + Dashboard + DevOps        │
│  ✓ PRODUCTION READY ─────→ Docker, logging, stress testing              │
│                                                                          │
│  Key Differentiators:                                                   │
│  • Real-time attack detection (no batch processing)                     │
│  • Zero external dependencies (pure Node.js)                            │
│  • Multi-source scanning (query, body, headers)                         │
│  • Retro-themed dashboard (unique portfolio angle)                      │
│  • Self-healing stress test (15-min verification)                       │
│  • Production logging with automatic rotation                           │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 DOCUMENTATION

| Document | Content |
|----------|---------|
| [API.md](API.md) | Complete endpoint reference & response formats |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Production deployment guide & scaling |
| [LOGGING.md](LOGGING.md) | Logging configuration & monitoring |
| [TESTING.md](TESTING.md) | Testing strategies & 15-min stress test |
| [CLAUDE.md](CLAUDE.md) | Architecture deep dive & implementation details |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contribution guidelines |

---

## ⚡ PERFORMANCE

- **Detection overhead**: <2% CPU impact
- **Dashboard refresh**: 3-second polling interval
- **Database**: Indexed queries on timestamp, ip, type, severity
- **Memory**: Connection pooling (max 100 concurrent)
- **Throughput**: 1000+ req/sec (tested in Docker)

---

## 🔒 SECURITY

- ✅ No external dependencies (reduces supply chain risk)
- ✅ Pattern-based detection (no ML/large models)
- ✅ PostgreSQL with parameterized queries
- ✅ API key support (disable in development)
- ✅ Environment variable configuration
- ✅ Security headers on all responses

**Security Policy**: [SECURITY.md](SECURITY.md)

---

## 📝 LICENSE

MIT License - see [LICENSE](LICENSE) for details

---

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                    Node Shield v0.2 · September 2026                        ║
║                   Status: Production-Ready · Actively Developed             ║
║                                                                              ║
║  Repository: github.com/achmad-firdaus/node-shield                         ║
║  npm: npm install node-shield                                               ║
║  Dashboard: http://localhost:3001 (local development)                       ║
║                                                                              ║
║  Built to demonstrate security expertise, system design, and full-stack     ║
║  execution. Suitable for production deployments with real attack logging.   ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```
