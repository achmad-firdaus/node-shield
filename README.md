# 🛡️ Node Shield

[![Tests](https://github.com/achmad-firdaus/node-shield/actions/workflows/test.yml/badge.svg)](https://github.com/achmad-firdaus/node-shield/actions/workflows/test.yml)
[![npm version](https://badge.fury.io/js/node-shield.svg)](https://www.npmjs.com/package/node-shield)
[![codecov](https://codecov.io/gh/achmad-firdaus/node-shield/branch/main/graph/badge.svg)](https://codecov.io/gh/achmad-firdaus/node-shield)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Production-grade runtime protection for Node.js applications. Detects and blocks real-world attacks in real-time.

## Features

- **8 Attack Detection Types**
  - SQL Injection
  - Remote Code Execution (RCE)
  - Path Traversal
  - Command Injection
  - Cross-Site Scripting (XSS)
  - NoSQL Injection
  - XXE (XML External Entity)
  - LDAP Injection

- **Multi-source Scanning** — Detect attacks in query params, POST body, headers, and form data
- **Real-time Dashboard** — See attacks being blocked as they happen (auto-refreshing)
- **IP Tracking & Brute Force Detection** — Identify attackers and rate-limit aggressive IPs
- **Whitelist/Blacklist Management** — Allow trusted IPs/patterns or block suspicious ones
- **Severity Levels** — CRITICAL (RCE, XXE) → HIGH → MEDIUM → LOW (XSS)
- **Multi-view Analytics** — Attack history, top attackers, detailed statistics
- **Zero Client Code Changes** — Works transparently with existing Node.js apps
- **Docker Ready** — Includes Dockerfile and docker-compose
- **npm Package** — Easy integration with Express and other frameworks
- **Production Ready** — Minimal performance overhead, no external dependencies

## Quick Start

### Option 1: Node.js (Standalone)
```bash
cd /Users/achmad/Documents/projects/node-shield
PORT=3001 npm start
```

### Option 2: Docker
```bash
docker-compose up
# Open http://localhost:3000
```

### Option 3: npm Package
```bash
npm install node-shield
```

Visit: `http://localhost:3001` (or 3000 for Docker)

## Testing

Try these attack scenarios:

```bash
# SQL Injection
curl "http://localhost:3001/search?q=admin' UNION SELECT 1,2,3--"

# Remote Code Execution  
curl "http://localhost:3001/execute?cmd=require('child_process').exec('ls')"

# Path Traversal
curl "http://localhost:3001/file?file=../../etc/passwd"

# Command Injection
curl "http://localhost:3001/?shell=ls | cat /etc/passwd"

# XSS
curl "http://localhost:3001/?input=<script>alert(1)</script>"
```

All attacks will be:
1. ✅ **Detected** in real-time
2. 🛑 **Blocked** instantly  
3. 📊 **Logged** to the dashboard

## Dashboard API

### Get Attack Log
```bash
curl http://localhost:3001/api/attacks
```

### Reset Attacks
```bash
curl -X POST http://localhost:3001/api/reset
```

### Whitelist Management
```bash
# View whitelist
curl http://localhost:3001/api/whitelist

# Add IP to whitelist
curl -X POST http://localhost:3001/api/whitelist \
  -H "Content-Type: application/json" \
  -d '{"type": "ip", "value": "192.168.1.100"}'

# Add pattern to whitelist
curl -X POST http://localhost:3001/api/whitelist \
  -H "Content-Type: application/json" \
  -d '{"type": "pattern", "value": "localhost"}'

# Remove from whitelist
curl -X DELETE http://localhost:3001/api/whitelist \
  -H "Content-Type: application/json" \
  -d '{"type": "ip", "value": "192.168.1.100"}'
```

### Blacklist Management
```bash
# View blacklist
curl http://localhost:3001/api/blacklist

# Add IP to blacklist
curl -X POST http://localhost:3001/api/blacklist \
  -H "Content-Type: application/json" \
  -d '{"type": "ip", "value": "192.168.1.50"}'

# Add pattern to blacklist (extra dangerous patterns)
curl -X POST http://localhost:3001/api/blacklist \
  -H "Content-Type: application/json" \
  -d '{"type": "pattern", "value": "DROP TABLE"}'

# Remove from blacklist
curl -X DELETE http://localhost:3001/api/blacklist \
  -H "Content-Type: application/json" \
  -d '{"type": "ip", "value": "192.168.1.50"}'
```

## Architecture

### Core Components

**shield.js** — Detection engine
- Pattern-based attack detection
- Persistent attack logging
- Dashboard HTML generator

**app-standalone.js** — Demo app
- Vulnerable Node.js HTTP server
- Shows attacks in action
- Real-time dashboard updates

## Detection Logic

### SQL Injection
Detects: `UNION`, `SELECT`, `INSERT`, `DELETE`, `DROP`, `;`, `--`

### RCE
Detects: `eval()`, `require()`, `child_process`, `exec()`, `spawn()`, `vm.`

### Path Traversal
Detects: `..` and `../` patterns

### Command Injection
Detects: Shell metacharacters `|`, `&`, `;`, `$`, `` ` ``

### XSS
Detects: `<script>`, `javascript:`, `onerror=`, `onclick=`, `onload=`

## Integration Examples

### With Express.js
```javascript
const NodeShield = require('node-shield');
const shield = new NodeShield();
const express = require('express');

const app = express();
app.use(shield.middleware()); // Custom middleware

app.get('/dashboard', (req, res) => {
  res.set('Content-Type', 'text/html');
  res.send(shield.getDashboardHTML());
});
```

### Standalone Server
```javascript
const NodeShield = require('node-shield');
const server = NodeShield.createServer(3000);
```

## Deployment

- **Development:** `npm start`
- **Docker:** `docker-compose up`
- **Production:** Use `NODE_ENV=production PORT=3000 npm start`

## Next Steps

- [x] Core attack detection (8 types)
- [x] IP tracking & brute force detection
- [x] Real-time dashboard with tabs
- [x] Docker & docker-compose
- [x] npm package integration
- [ ] Deploy to Vercel
- [ ] Add authentication for dashboard
- [ ] Create SaaS version with analytics
- [ ] Email/Slack alerts

## Portfolio Angle

This product demonstrates:
- ✅ **Security Expertise** — Deep understanding of real attack vectors
- ✅ **System Design** — Building transparent, zero-overhead protection
- ✅ **Full-stack Execution** — From detection logic to polished UI
- ✅ **Production Mindset** — Works in real environments without breaking apps

Perfect for security engineering roles at:
- Cloud platforms (AWS, Google, Azure)
- Hosting providers (Vercel, Netlify, etc.)
- Security companies
- Fintech / regulated industries

---

**Built by:** Achmad  
**Status:** MVP - Actively developed  
**Latest:** 2026-09-26
