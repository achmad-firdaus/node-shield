# Security Model

## Detection Mechanisms

Node Shield uses **pattern-based detection** to identify security threats at runtime.

### How It Works

1. **Request Interception** — Middleware intercepts all incoming requests
2. **Parameter Scanning** — Each parameter is checked against attack patterns
3. **Pattern Matching** — Suspicious keywords/syntax are detected
4. **Threat Classification** — Attacks are categorized by type and severity
5. **Blocking** — Malicious requests are rejected with HTTP 400

### Threat Model

**Attacks Detected:**
- SQL Injection (SQLi)
- Remote Code Execution (RCE)
- Path Traversal
- Command Injection
- Cross-Site Scripting (XSS)
- NoSQL Injection
- XML External Entity (XXE)
- LDAP Injection

**Detection Patterns:**

```
SQL Injection: UNION, SELECT, INSERT, DELETE, DROP, EXEC, EXECUTE, --, ;
RCE: eval, require, import, child_process, exec, spawn, fork, vm
Path Traversal: .., ../
Command Injection: |, &, ;, $, `
XSS: <script>, javascript:, onerror=, onclick=, onload=
NoSQL: {$, [$, {}
XXE: <!ENTITY, SYSTEM, PUBLIC, &, file://
LDAP: *, (, |(LDAP query context)
```

---

## Threat Severity

### CRITICAL
- **RCE** — Attacker can execute arbitrary code
- **XXE** — Attacker can read files or launch SSRF
- **Rate Limited** — Indicates brute force/scanning

### HIGH
- **SQL Injection** — Unauthorized database access
- **NoSQL Injection** — Database compromise
- **Command Injection** — System command execution

### MEDIUM
- **Path Traversal** — Unauthorized file access
- **LDAP Injection** — Directory service manipulation

### LOW
- **XSS** — Client-side code injection

---

## Limitations

### Known Limitations

1. **Pattern-Based Detection**
   - Can be bypassed with encoding/obfuscation
   - May produce false positives with legitimate data
   - Not ML-based (no learning from new attack vectors)

2. **HTTP Layer Only**
   - Detects request parameters only
   - Does not inspect request bodies by default
   - Missing: POST body scanning, header analysis

3. **No Context Awareness**
   - Does not understand business logic
   - Cannot distinguish legitimate from malicious usage
   - Assumes all pattern matches = attacks

4. **Rate Limiting**
   - Simple 10-second window (not configurable)
   - Does not actually block IPs (just flags)

---

## Best Practices

### Using Node Shield Safely

✅ **DO:**
- Use as a **supplementary** security layer
- Combine with WAF, authentication, validation
- Monitor attack logs regularly
- Review false positives
- Update detection patterns as threats evolve

❌ **DON'T:**
- Rely on Node Shield as sole defense
- Use without input validation
- Ignore rate-limit alerts
- Deploy to production without testing
- Disable logging

---

## Security Considerations

### For Production Use

1. **Enable Logging** — Capture all attacks for audit trails
2. **Monitor Dashboards** — Review analytics regularly
3. **Set Up Alerts** — Email/Slack notifications (future)
4. **Keep Patterns Updated** — Add custom patterns for your app
5. **Test Legitimately** — Ensure real users aren't blocked

### False Positives

If legitimate requests are blocked:

1. Check the blocked payload
2. Add a whitelist exception (feature: TBD)
3. Adjust detection patterns
4. Review request validation

### Data Retention

- Attack logs stored in `./attacks.json`
- No automatic cleanup (TBD)
- Manually reset with `/api/reset` or `node cli.js reset`

---

## Compliance

Node Shield helps meet security requirements for:
- **OWASP Top 10** — Protects against injection attacks
- **PCI DSS** — Detects payment card injection attempts
- **GDPR** — Audit trails for security incidents
- **SOC 2** — Monitors and logs security events

> **Note:** Node Shield alone does not guarantee compliance.

---

## Responsible Disclosure

If you discover a security vulnerability in Node Shield:

1. **Do not** open a public issue
2. Email: `achmad@example.com` with details
3. Include: description, impact, reproduction steps
4. Allow 30 days for a patch before disclosure

---

## Future Enhancements

- [ ] ML-based anomaly detection
- [ ] Configurable pattern thresholds
- [ ] Whitelisting for legitimate patterns
- [ ] Request body scanning
- [ ] Custom webhook alerts
- [ ] Rate-limit IP blocking
- [ ] Encrypted attack log storage

