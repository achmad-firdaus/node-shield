# Request Body Scanning Enhancement

## Overview
Enhanced Node Shield's attack detection to comprehensively scan request bodies, query parameters, and HTTP headers with unified detection logic.

## Key Changes

### 1. New Core Methods in `shield.js`

#### `detectAttack(payload)`
- Single method that tests a payload against all 8 detection methods
- Returns the attack type if detected, null otherwise
- Eliminates code duplication across detection logic

#### `scanData(data, endpoint, clientIP)`
- Generic method to scan structured data (objects/strings) for attacks
- Iterates through all keys in an object and tests values
- Automatically logs detected attacks
- Returns array of detected attacks with metadata

### 2. Enhanced Middleware

**Before:** Hardcoded specific parameter names only
```javascript
if (query.q && shield.detectSQLInjection(query.q)) { ... }
if (query.cmd && shield.detectRCE(query.cmd)) { ... }
```

**After:** Scans all query parameters with all 8 detection methods
```javascript
for (const [param, value] of Object.entries(query)) {
  const attackType = shield.detectAttack(value);
  if (attackType) { shield.logAttack(...) }
}
```

### 3. Request Body Scanning
- POST/PUT bodies are now scanned with all 8 detection methods
- Supports both JSON and form-encoded content types
- Logs source as "body" with parameter name

### 4. Header Scanning Expansion
**Previous headers checked:** user-agent, referer, cookie, authorization (+ only 4 detectors)

**New headers checked:** 
- user-agent, referer, cookie, authorization
- x-forwarded-for, x-original-url, x-rewrite-url, content-type

**All 8 detectors now applied** to all headers (previously only 4)

## Detection Coverage

### Query Parameters
- ✓ SQL Injection
- ✓ RCE
- ✓ Path Traversal
- ✓ XSS
- ✓ Command Injection
- ✓ NoSQL Injection
- ✓ XXE
- ✓ LDAP Injection

### POST/PUT Body
- ✓ All 8 attack types
- ✓ JSON payloads
- ✓ Form-encoded payloads
- ✓ Nested object values

### HTTP Headers
- ✓ All 8 attack types
- ✓ Expanded header list
- ✓ Custom header support

## Example Attack Scenarios Now Caught

### Query Parameter (Universal)
```bash
curl "http://localhost:3001/search?anyParam=require('fs')"
# Previously: Not detected (only checked specific param names)
# Now: ✓ Detected as RCE
```

### POST Body
```bash
curl -X POST http://localhost:3001/api/data \
  -H "Content-Type: application/json" \
  -d '{"name": "admin\" OR \"1\"=\"1"}'
# ✓ Detected as SQL Injection
```

### Header-Based Attack
```bash
curl http://localhost:3001/api/data \
  -H "X-Forwarded-For: '; DROP TABLE users--"
# ✓ Detected as SQL Injection in header
```

## Code Quality Improvements

1. **DRY Principle**: Consolidated 8 detection methods into single `detectAttack()` call
2. **Maintainability**: Changes to detection logic only need to be made in one place
3. **Consistency**: All three sources (query, body, headers) use identical detection logic
4. **Testability**: New test file (`test-enhanced-scanning.js`) validates all sources and attack types

## Backward Compatibility

✓ Fully backward compatible
- Existing detection patterns unchanged
- Severity calculations unchanged
- Database schema unchanged
- API endpoints unchanged
- Logging format unchanged

## Performance Impact

- Minimal: Single pass through detection methods per parameter
- Unified detection actually reduces overhead vs previous approach with duplicate checks

## Testing

Run the comprehensive test suite:
```bash
npm start &
node test-enhanced-scanning.js
```

Tests verify:
- Query parameter scanning (all params)
- POST body scanning (JSON and form-encoded)
- Header scanning (expanded list)
- Attack type detection accuracy
- Clean requests pass through

## Migration Notes

No migration needed. The enhancement is purely additive and doesn't change the underlying data structures or API contracts.
