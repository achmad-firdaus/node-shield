# Node Shield API Documentation

## REST API

### Dashboard & UI

#### `GET /`
Returns the interactive attack dashboard.

**Response:** HTML page

**Example:**
```bash
curl http://localhost:3001/
```

---

### Attack Endpoints

#### `GET /api/attacks`
Retrieve all logged attacks.

**Response:**
```json
{
  "attacks": [
    {
      "id": "1234567890",
      "timestamp": "2026-09-26T07:15:00.000Z",
      "type": "SQL Injection",
      "endpoint": "/search",
      "payload": "admin' UNION SELECT 1,2,3--",
      "ip": "192.168.1.100",
      "severity": "HIGH",
      "blocked": true,
      "rateLimit": false
    }
  ]
}
```

**Example:**
```bash
curl http://localhost:3001/api/attacks | jq
```

---

#### `GET /api/stats`
Retrieve attack statistics and analytics.

**Response:**
```json
{
  "total": 42,
  "last24h": 12,
  "rateLimit": 3,
  "byType": {
    "SQL Injection": 15,
    "RCE": 8,
    "XSS": 5,
    "Path Traversal": 4,
    "Command Injection": 3,
    "NoSQL Injection": 3,
    "XXE": 2,
    "LDAP Injection": 2
  },
  "byIP": {
    "192.168.1.100": 25,
    "10.0.0.50": 12,
    "192.168.1.200": 5
  },
  "topAttackers": [
    { "ip": "192.168.1.100", "count": 25 },
    { "ip": "10.0.0.50", "count": 12 },
    { "ip": "192.168.1.200", "count": 5 }
  ]
}
```

**Example:**
```bash
curl http://localhost:3001/api/stats | jq
```

---

#### `POST /api/reset`
Clear all logged attacks.

**Response:**
```json
{
  "message": "Attacks log reset"
}
```

**Example:**
```bash
curl -X POST http://localhost:3001/api/reset
```

---

## Attack Detection Parameters

### Query String Format
Attacks are detected based on suspicious query parameters:

- `?q=` → SQL Injection detection
- `?cmd=` → RCE detection
- `?file=` → Path Traversal detection
- `?shell=` → Command Injection detection
- `?input=` → XSS detection
- `?nosql=` → NoSQL Injection detection
- `?xml=` → XXE detection
- `?ldap=` → LDAP Injection detection

### Example Attack Requests

```bash
# SQL Injection
curl "http://localhost:3001/?q=admin' UNION SELECT 1,2,3--"

# RCE
curl "http://localhost:3001/?cmd=require('child_process').exec('ls')"

# Path Traversal
curl "http://localhost:3001/?file=../../etc/passwd"

# Command Injection
curl "http://localhost:3001/?shell=ls | cat /etc/passwd"

# XSS
curl "http://localhost:3001/?input=<script>alert('xss')</script>"

# NoSQL Injection
curl "http://localhost:3001/?nosql={\$ne:null}"

# XXE
curl "http://localhost:3001/?xml=<!DOCTYPE foo [<!ENTITY xxe SYSTEM>]>"

# LDAP Injection
curl "http://localhost:3001/?ldap=*)(uid=*"
```

---

## JavaScript API

### Using NodeShield in Code

```javascript
const NodeShield = require('node-shield');
const shield = new NodeShield();

// Get all attacks
const attacks = shield.getAttacks();

// Get statistics
const stats = shield.getStats();
// Returns: { total, byType, topAttackers, rateLimit, last24h }

// Log an attack manually
shield.logAttack(
  'Custom Attack',     // type
  '/endpoint',         // endpoint
  'payload here',      // payload
  { param: 'key' },    // details
  '192.168.1.100'      // ip
);

// Check for specific attack types
const isSQL = shield.detectSQLInjection(userInput);
const isRCE = shield.detectRCE(userInput);
const isXSS = shield.detectXSS(userInput);

// Get dashboard HTML
const html = shield.getDashboardHTML();
```

---

## CLI Commands

```bash
# View statistics
node cli.js stats

# View recent attacks
node cli.js attacks

# Clear attack logs
node cli.js reset

# Export data to JSON
node cli.js export

# Help
node cli.js help
```

---

## Response Codes

- **200** - Success
- **400** - Attack detected and blocked
- **404** - Endpoint not found
- **500** - Server error

---

## Rate Limiting

An IP is flagged as rate-limited when it makes >5 attacks within 10 seconds.

- Flagged attacks have `rateLimit: true`
- Severity is escalated to `CRITICAL`
- Counted in `stats.rateLimit`

---

## Attack Severity Levels

| Level | Attack Types |
|-------|--------------|
| CRITICAL | RCE, XXE (+ rate-limited) |
| HIGH | SQL Injection, NoSQL Injection, Command Injection |
| MEDIUM | Path Traversal, LDAP Injection |
| LOW | XSS |

