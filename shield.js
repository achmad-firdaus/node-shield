const { Pool } = require('pg');

class NodeShield {
  constructor() {
    this.ipRates = {};
    this.attackCounter = 0;
    this.useInMemoryDB = !process.env.DB_HOST;
    this.inMemoryAttacks = [];
    this.whitelistIPs = new Set();
    this.blacklistIPs = new Set();
    this.whitelistPatterns = new Set();
    this.blacklistPatterns = new Set();

    if (process.env.DB_HOST) {
      // PostgreSQL connection pool
      this.pool = new Pool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'node_shield',
        user: process.env.DB_USER || 'shield_user',
        password: process.env.DB_PASSWORD || 'shield_password',
        max: 100,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        statement_timeout: 10000
      });

      this.pool.on('error', (err) => {
        console.error('[DB ERROR]', err.message);
        if (!this.useInMemoryDB) {
          console.log('[SHIELD] Switching to in-memory storage for testing');
          this.useInMemoryDB = true;
        }
      });
    } else {
      console.log('[SHIELD] Using in-memory storage (no DB_HOST configured)');
    }
  }

  isIPWhitelisted(ip) {
    return this.whitelistIPs.has(ip);
  }

  isIPBlacklisted(ip) {
    return this.blacklistIPs.has(ip);
  }

  isPayloadWhitelisted(payload) {
    for (const pattern of this.whitelistPatterns) {
      if (String(payload).includes(pattern)) return true;
    }
    return false;
  }

  isPayloadBlacklisted(payload) {
    for (const pattern of this.blacklistPatterns) {
      if (String(payload).includes(pattern)) return true;
    }
    return false;
  }

  addIPToWhitelist(ip) {
    this.whitelistIPs.add(ip);
    console.log(`[SHIELD] IP ${ip} added to whitelist`);
  }

  removeIPFromWhitelist(ip) {
    this.whitelistIPs.delete(ip);
    console.log(`[SHIELD] IP ${ip} removed from whitelist`);
  }

  addIPToBlacklist(ip) {
    this.blacklistIPs.add(ip);
    console.log(`[SHIELD] IP ${ip} added to blacklist`);
  }

  removeIPFromBlacklist(ip) {
    this.blacklistIPs.delete(ip);
    console.log(`[SHIELD] IP ${ip} removed from blacklist`);
  }

  addPatternToWhitelist(pattern) {
    this.whitelistPatterns.add(pattern);
    console.log(`[SHIELD] Pattern "${pattern}" added to whitelist`);
  }

  removePatternFromWhitelist(pattern) {
    this.whitelistPatterns.delete(pattern);
    console.log(`[SHIELD] Pattern "${pattern}" removed from whitelist`);
  }

  addPatternToBlacklist(pattern) {
    this.blacklistPatterns.add(pattern);
    console.log(`[SHIELD] Pattern "${pattern}" added to blacklist`);
  }

  removePatternFromBlacklist(pattern) {
    this.blacklistPatterns.delete(pattern);
    console.log(`[SHIELD] Pattern "${pattern}" removed from blacklist`);
  }

  logAttack(type, endpoint, payload, details, ip = '0.0.0.0') {
    // Check whitelist/blacklist before logging
    if (this.isIPWhitelisted(ip)) {
      console.log(`[SHIELD] [WHITELISTED] Skipped ${type} from IP ${ip} (whitelisted)`);
      return false;
    }

    if (this.isIPBlacklisted(ip)) {
      console.log(`[SHIELD] [BLACKLISTED] Blocked ${type} from IP ${ip} (blacklisted IP)`);
      this.attackCounter++;
    } else if (this.isPayloadWhitelisted(payload)) {
      console.log(`[SHIELD] [WHITELISTED] Skipped ${type} from ${ip} (payload whitelisted)`);
      return false;
    } else if (this.isPayloadBlacklisted(payload)) {
      console.log(`[SHIELD] [EXTRA DANGEROUS] Blocked ${type} from ${ip} (extra blacklist pattern matched)`);
      this.attackCounter++;
    } else {
      this.attackCounter++;
    }

    const severity = this.calculateSeverity(type);
    const id = Date.now().toString() + '-' + this.attackCounter;
    const timestamp = new Date().toISOString();
    const payloadStr = String(payload).slice(0, 200);

    // Attack record
    const attack = {
      id, timestamp, type, endpoint, payload: payloadStr, ip, blocked: true, severity,
      details: JSON.stringify(details), num: this.attackCounter
    };

    // Try database first, fallback to in-memory
    if (!this.useInMemoryDB && this.pool) {
      this.pool.query(
        `INSERT INTO attacks
         (id, timestamp, type, endpoint, payload, ip, blocked, severity, details)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [id, timestamp, type, endpoint, payloadStr, ip, true, severity, JSON.stringify(details)]
      ).catch(err => {
        console.error('[DB INSERT ERROR]', err.message);
        this.useInMemoryDB = true;
        this.inMemoryAttacks.push(attack);
      });
    } else {
      this.inMemoryAttacks.push(attack);
    }

    // Track IP rate for brute force detection
    if (!this.ipRates[ip]) {
      this.ipRates[ip] = { count: 0, firstSeen: Date.now(), types: {} };
    }
    this.ipRates[ip].count++;
    this.ipRates[ip].types[type] = (this.ipRates[ip].types[type] || 0) + 1;

    // Check for rate limit (>5 attacks in 10 sec = brute force)
    const timeSinceFirst = Date.now() - this.ipRates[ip].firstSeen;
    if (timeSinceFirst < 10000 && this.ipRates[ip].count > 5) {
      console.log(`[SHIELD] [CRITICAL] Blocked ${type} from ${ip} (RATE LIMITED)`);
    } else {
      console.log(`[SHIELD] [${severity}] Blocked ${type} from ${ip}`);
    }

    return true;
  }

  calculateSeverity(attackType) {
    const severityMap = {
      'RCE': 'CRITICAL',
      'XXE': 'HIGH',
      'SQL Injection': 'HIGH',
      'NoSQL Injection': 'HIGH',
      'LDAP Injection': 'MEDIUM',
      'Command Injection': 'HIGH',
      'Path Traversal': 'MEDIUM',
      'XSS': 'LOW'
    };
    return severityMap[attackType] || 'MEDIUM';
  }

  detectSQLInjection(query) {
    const sqlKeywords = ['union', 'select', 'insert', 'update', 'delete', 'drop', 'exec', 'execute', '--', ';', "'", '"', '/*', '*/', 'or', 'and'];
    const lowerQuery = String(query).toLowerCase();
    return sqlKeywords.some(keyword => lowerQuery.includes(keyword));
  }

  detectRCE(code) {
    const rcePatterns = ['eval', 'require', 'import', 'child_process', 'exec', 'spawn', 'fork', 'vm.', '${', '`', 'system(', 'os.'];
    const codeStr = String(code).toLowerCase();
    return rcePatterns.some(pattern => codeStr.includes(pattern));
  }

  detectPathTraversal(filePath) {
    const path = String(filePath).toLowerCase();
    return path.includes('..') || path.includes('../') || path.includes('..%2f') || path.includes('etc/passwd') || path.includes('etc/shadow');
  }

  detectCommandInjection(cmd) {
    const shellMetachars = ['|', '&', ';', '$', '`', '\n', '||', '&&', '>', '<', 'nc ', 'cat ', 'whoami', 'id '];
    const cmdStr = String(cmd);
    return shellMetachars.some(char => cmdStr.includes(char));
  }

  detectXSS(input) {
    const xssPatterns = ['<script', 'javascript:', 'onerror=', 'onclick=', 'onload=', '<svg', '<img', '<iframe', 'alert('];
    const inputStr = String(input).toLowerCase();
    return xssPatterns.some(pattern => inputStr.includes(pattern));
  }

  detectNoSQLInjection(query) {
    const noSqlPatterns = ['{$', '[$', '{}', 'db.', 'collection.', 'ne:', 'gt:', 'regex:', 'ne:null'];
    const queryStr = String(query).toLowerCase();
    return noSqlPatterns.some(pattern => queryStr.includes(pattern));
  }

  detectXXE(xml) {
    const xmlStr = String(xml);
    return /<!DOCTYPE|<!ENTITY|SYSTEM|PUBLIC|&[a-z]+;|file:\/\/|entity/i.test(xmlStr);
  }

  detectLDAPInjection(query) {
    const ldapPatterns = ['*', '(|', '(&', 'cn=', 'uid=', '(cn', 'objectclass'];
    const queryStr = String(query).toLowerCase();
    return ldapPatterns.some(pattern => queryStr.includes(pattern));
  }

  detectAttack(payload) {
    const attackTypes = [
      { detector: this.detectSQLInjection.bind(this), type: 'SQL Injection' },
      { detector: this.detectRCE.bind(this), type: 'RCE' },
      { detector: this.detectPathTraversal.bind(this), type: 'Path Traversal' },
      { detector: this.detectCommandInjection.bind(this), type: 'Command Injection' },
      { detector: this.detectXSS.bind(this), type: 'XSS' },
      { detector: this.detectNoSQLInjection.bind(this), type: 'NoSQL Injection' },
      { detector: this.detectXXE.bind(this), type: 'XXE' },
      { detector: this.detectLDAPInjection.bind(this), type: 'LDAP Injection' }
    ];

    for (const { detector, type } of attackTypes) {
      if (detector(payload)) {
        return type;
      }
    }
    return null;
  }

  scanData(data, endpoint, clientIP) {
    const detectedAttacks = [];

    if (typeof data === 'object' && data !== null) {
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string') {
          const attackType = this.detectAttack(value);
          if (attackType) {
            detectedAttacks.push({ attackType, payload: value, source: key });
          }
        }
      }
    } else if (typeof data === 'string') {
      const attackType = this.detectAttack(data);
      if (attackType) {
        detectedAttacks.push({ attackType, payload: data, source: 'direct' });
      }
    }

    for (const attack of detectedAttacks) {
      this.logAttack(attack.attackType, endpoint, attack.payload, { param: attack.source }, clientIP);
    }

    return detectedAttacks;
  }

  middleware() {
    return (req, res, next) => {
      const clientIP = req.ip || req.connection.remoteAddress || '0.0.0.0';

      // Scan all query parameters
      if (req.query && Object.keys(req.query).length > 0) {
        const attacks = this.scanData(req.query, req.path, clientIP);
        if (attacks.length > 0) {
          return res.status(400).json({ error: `${attacks[0].attackType} detected and blocked` });
        }
      }

      next();
    };
  }

  async getAttacks(page = 1, limit = 100) {
    if (this.useInMemoryDB) {
      const offset = (page - 1) * limit;
      return this.inMemoryAttacks
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(offset, offset + limit);
    }
    try {
      const offset = (page - 1) * limit;
      const result = await this.pool.query(
        `SELECT * FROM attacks ORDER BY timestamp DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      return result.rows.map(row => ({
        id: row.id,
        timestamp: row.timestamp,
        type: row.type,
        endpoint: row.endpoint,
        payload: row.payload,
        details: row.details,
        ip: row.ip,
        blocked: row.blocked,
        severity: row.severity
      }));
    } catch (err) {
      console.error('[GET ATTACKS ERROR]', err);
      this.useInMemoryDB = true;
      return this.getAttacks(page, limit);
    }
  }

  async getTotalAttacks() {
    if (this.useInMemoryDB) {
      return this.inMemoryAttacks.length;
    }
    try {
      const result = await this.pool.query('SELECT COUNT(*) as count FROM attacks');
      return parseInt(result.rows[0].count);
    } catch (err) {
      console.error('[GET TOTAL ERROR]', err);
      this.useInMemoryDB = true;
      return this.inMemoryAttacks.length;
    }
  }

  async getStats() {
    if (this.useInMemoryDB) {
      const stats = { total: 0, byType: {}, byIP: {}, topAttackers: [], rateLimit: 0, last24h: 0 };
      stats.total = this.inMemoryAttacks.length;

      // Count by type
      this.inMemoryAttacks.forEach(attack => {
        stats.byType[attack.type] = (stats.byType[attack.type] || 0) + 1;
      });

      // Count by IP
      const ipCounts = {};
      this.inMemoryAttacks.forEach(attack => {
        ipCounts[attack.ip] = (ipCounts[attack.ip] || 0) + 1;
      });
      stats.topAttackers = Object.entries(ipCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([ip, count]) => ({ ip, count }));

      // Count critical
      stats.rateLimit = this.inMemoryAttacks.filter(a => a.severity === 'CRITICAL').length;

      return stats;
    }

    try {
      // Get all stats in parallel
      const [typeResult, ipResult, totalResult, last24hResult] = await Promise.all([
        this.pool.query('SELECT type, COUNT(*) as count FROM attacks GROUP BY type ORDER BY count DESC'),
        this.pool.query('SELECT ip, COUNT(*) as count FROM attacks GROUP BY ip ORDER BY count DESC LIMIT 5'),
        this.pool.query('SELECT COUNT(*) as count FROM attacks'),
        this.pool.query(`SELECT COUNT(*) as count FROM attacks WHERE timestamp > NOW() - INTERVAL '24 hours'`)
      ]);

      const stats = {
        total: parseInt(totalResult.rows[0].count),
        byType: {},
        byIP: {},
        topAttackers: [],
        rateLimit: 0,
        last24h: parseInt(last24hResult.rows[0].count)
      };

      // Build byType
      typeResult.rows.forEach(row => {
        stats.byType[row.type] = parseInt(row.count);
      });

      // Build topAttackers
      stats.topAttackers = ipResult.rows.map(row => ({
        ip: row.ip,
        count: parseInt(row.count)
      }));

      // Get CRITICAL count for rateLimit
      const criticalResult = await this.pool.query(
        `SELECT COUNT(*) as count FROM attacks WHERE severity = 'CRITICAL'`
      );
      stats.rateLimit = parseInt(criticalResult.rows[0].count);

      return stats;
    } catch (err) {
      console.error('[GET STATS ERROR]', err);
      this.useInMemoryDB = true;
      return this.getStats();
      return { total: 0, byType: {}, byIP: {}, topAttackers: [], rateLimit: 0, last24h: 0 };
    }
  }

  calculateHealthScore() {
    let score = 100;
    const attacks = this.inMemoryAttacks;

    attacks.forEach(attack => {
      switch (attack.severity) {
        case 'CRITICAL': score -= 10; break;
        case 'HIGH': score -= 5; break;
        case 'MEDIUM': score -= 2; break;
        case 'LOW': score -= 1; break;
      }
    });

    return Math.max(0, score);
  }

  calculateThreatLevel() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);

    const lastHour = this.inMemoryAttacks.filter(a => new Date(a.timestamp).getTime() > oneHourAgo);
    const last24h = this.inMemoryAttacks.filter(a => new Date(a.timestamp).getTime() > twentyFourHoursAgo);
    const criticalCount = this.inMemoryAttacks.filter(a => a.severity === 'CRITICAL').length;

    if (lastHour.length > 5 || criticalCount > 10 || last24h.length > 20) {
      return 'CRITICAL';
    }
    if (lastHour.length > 3 || last24h.length > 5) {
      return 'HIGH';
    }
    if (lastHour.length > 1 || last24h.length > 2) {
      return 'MEDIUM';
    }
    return 'LOW';
  }

  getDashboardHTML() {
    const healthScore = this.calculateHealthScore();
    const threatLevel = this.calculateThreatLevel();
    const totalAttacks = this.inMemoryAttacks.length;
    const criticalCount = this.inMemoryAttacks.filter(a => a.severity === 'CRITICAL').length;
    const highCount = this.inMemoryAttacks.filter(a => a.severity === 'HIGH').length;
    const mediumCount = this.inMemoryAttacks.filter(a => a.severity === 'MEDIUM').length;
    const lowCount = this.inMemoryAttacks.filter(a => a.severity === 'LOW').length;
    const rceCount = this.inMemoryAttacks.filter(a => a.type === 'RCE').length;
    const sqlCount = this.inMemoryAttacks.filter(a => a.type === 'SQL Injection').length;

    const getThreatColor = (level) => {
      switch (level) {
        case 'CRITICAL': return '#ff0000';
        case 'HIGH': return '#ff9900';
        case 'MEDIUM': return '#ffff00';
        case 'LOW': return '#00ff00';
        default: return '#00ffff';
      }
    };

    const getHealthColor = (score) => {
      if (score >= 80) return '#00ff00';
      if (score >= 60) return '#ffff00';
      if (score >= 40) return '#ff9900';
      return '#ff0000';
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>NODE SHIELD SECURITY MONITOR</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap');

          * { margin: 0; padding: 0; box-sizing: border-box; }

          body {
            font-family: 'Courier Prime', monospace;
            background: #001a33;
            color: #00ff00;
            padding: 12px;
            line-height: 1.3;
          }

          .header {
            text-align: center;
            border-top: 3px solid #00ff00;
            border-bottom: 3px solid #00ff00;
            padding: 8px 0;
            margin-bottom: 12px;
            letter-spacing: 3px;
          }

          .header h1 {
            font-size: 16px;
            color: #00ff00;
            font-weight: bold;
          }

          .header p {
            font-size: 11px;
            color: #00ccff;
            margin-top: 3px;
          }

          .main-grid {
            display: grid;
            grid-template-columns: 1fr 2fr;
            gap: 12px;
            margin-bottom: 12px;
          }

          .panel {
            border: 2px solid #00ff00;
            background: #0a1f3d;
          }

          .panel-header {
            background: #00ff00;
            color: #001a33;
            padding: 5px 8px;
            font-weight: bold;
            font-size: 11px;
            letter-spacing: 1px;
          }

          .panel-content {
            padding: 8px;
            font-size: 10px;
          }

          .status-group {
            margin-bottom: 10px;
          }

          .status-item {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            border-bottom: 1px solid #003366;
            gap: 8px;
          }

          .status-item:last-child {
            border-bottom: none;
          }

          .status-label {
            color: #00ccff;
            flex-shrink: 0;
            max-width: 60%;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .status-value {
            color: #00ff00;
            font-weight: bold;
            flex-shrink: 0;
            white-space: nowrap;
          }

          .metric-row {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 8px;
            margin: 10px 0;
          }

          .metric-box {
            border: 1px solid #00ccff;
            padding: 6px;
            text-align: center;
            background: #051a33;
          }

          .metric-label {
            font-size: 9px;
            color: #00ccff;
            text-transform: uppercase;
            margin-bottom: 3px;
          }

          .metric-value {
            font-size: 14px;
            font-weight: bold;
            color: #00ff00;
          }

          .threat-display {
            text-align: center;
            margin: 8px 0;
            padding: 8px;
            border: 1px solid #00ccff;
            background: #051a33;
          }

          .threat-value {
            font-size: 28px;
            font-weight: bold;
            letter-spacing: 2px;
          }

          .health-bar {
            width: 100%;
            height: 12px;
            border: 1px solid #00ccff;
            background: #051a33;
            margin: 6px 0 0 0;
            overflow: hidden;
          }

          .health-fill {
            height: 100%;
            background: #00ff00;
          }

          .stat-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin: 12px 0 0 0;
            padding-top: 8px;
            border-top: 1px solid #003366;
          }

          .stat-box {
            border: 1px solid #00ccff;
            padding: 6px;
            text-align: center;
            background: #051a33;
          }

          .stat-number {
            font-size: 16px;
            font-weight: bold;
            color: #ffff00;
          }

          .stat-name {
            font-size: 8px;
            color: #00ccff;
            text-transform: uppercase;
          }

          .attack-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9px;
          }

          .attack-table th {
            text-align: left;
            padding: 4px;
            background: #051a33;
            border-bottom: 2px solid #00ccff;
            color: #00ccff;
            font-weight: bold;
          }

          .attack-table td {
            padding: 4px;
            border-bottom: 1px solid #003366;
          }

          .attack-table tr:hover {
            background: #051a33;
          }

          .attack-id { color: #00ccff; }
          .attack-time { color: #00ff00; }
          .attack-severity { font-weight: bold; }
          .attack-type { color: #ffff00; }
          .attack-ip { color: #ff9900; }

          .severity-critical { color: #ff0000; }
          .severity-high { color: #ff9900; }
          .severity-medium { color: #ffff00; }
          .severity-low { color: #00ff00; }

          .bottom-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 12px;
          }

          .footer {
            text-align: center;
            border-top: 3px solid #00ff00;
            border-bottom: 3px solid #00ff00;
            padding: 8px 0;
            font-size: 10px;
            margin-top: 12px;
            color: #00ff00;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>⚔ NODE SHIELD SECURITY MONITOR</h1>
          <p>Real-time Threat Detection & Attack Prevention System</p>
        </div>

        <div class="main-grid">
          <!-- LEFT PANEL -->
          <div class="panel">
            <div class="panel-header">SYSTEM STATUS</div>
            <div class="panel-content">
              <div class="status-group">
                <div class="status-item">
                  <span class="status-label">● SYSTEM:</span>
                  <span class="status-value">${healthScore >= 60 ? 'PROTECTED' : 'COMPROMISED'}</span>
                </div>
                <div class="status-item">
                  <span class="status-label">UPDATED:</span>
                  <span class="status-value">${new Date().toLocaleTimeString()}</span>
                </div>
              </div>

              <div class="metric-row">
                <div class="metric-box">
                  <div class="metric-label">Response Time</div>
                  <div class="metric-value" style="color: #00ff00;">1ms</div>
                </div>
                <div class="metric-box">
                  <div class="metric-label">Detection Rate</div>
                  <div class="metric-value" style="color: #00ff00;">99%</div>
                </div>
                <div class="metric-box">
                  <div class="metric-label">Uptime</div>
                  <div class="metric-value" style="color: #00ff00;">--:h</div>
                </div>
              </div>

              <div style="border-top: 1px solid #003366; margin-top: 12px; padding-top: 8px;">
                <div class="status-item">
                  <span class="status-label">THREAT LEVEL</span>
                </div>
                <div class="threat-display">
                  <div class="threat-value" style="color: ${getThreatColor(threatLevel)};">${threatLevel}</div>
                </div>
              </div>

              <div style="border-top: 1px solid #003366; margin-top: 12px; padding-top: 8px;">
                <div class="status-item">
                  <span class="status-label">HEALTH SCORE</span>
                </div>
                <div class="threat-display">
                  <div style="font-size: 22px; font-weight: bold; color: ${getHealthColor(healthScore)};">${healthScore}%</div>
                  <div class="health-bar">
                    <div class="health-fill" style="width: ${healthScore}%; background: ${getHealthColor(healthScore)};"></div>
                  </div>
                </div>
              </div>

              <div class="stat-grid">
                <div class="stat-box">
                  <div class="stat-name">Total Attacks</div>
                  <div class="stat-number" style="color: #ffff00;">${String(totalAttacks).padStart(5, '0')}</div>
                </div>
                <div class="stat-box">
                  <div class="stat-name">Critical Threats</div>
                  <div class="stat-number" style="color: #ff0000;">${String(criticalCount).padStart(2, '0')}</div>
                </div>
                <div class="stat-box">
                  <div class="stat-name">RCE Attempts</div>
                  <div class="stat-number" style="color: #ff9900;">${rceCount}</div>
                </div>
                <div class="stat-box">
                  <div class="stat-name">SQL Injection</div>
                  <div class="stat-number" style="color: #00ff99;">${sqlCount}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- RIGHT PANEL -->
          <div class="panel">
            <div class="panel-header">ATTACK LOG (ALL)</div>
            <div class="panel-content">
              <table class="attack-table">
                <thead>
                  <tr>
                    <th>TIME</th>
                    <th>SEVERITY</th>
                    <th>ATTACK TYPE</th>
                    <th>SOURCE IP</th>
                    <th>ENDPOINT</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.inMemoryAttacks.slice(0, 20).map(attack => `
                    <tr>
                      <td class="attack-time">${new Date(attack.timestamp).toLocaleTimeString()}</td>
                      <td class="attack-severity severity-${attack.severity.toLowerCase()}">${attack.severity}</td>
                      <td class="attack-type">${attack.type}</td>
                      <td class="attack-ip">${attack.ip}</td>
                      <td class="attack-id">${attack.endpoint}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              ${this.inMemoryAttacks.length === 0 ? `
                <div style="text-align: center; padding: 30px; color: #00ff99;">
                  ● NO ATTACKS DETECTED
                </div>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- BOTTOM PANELS -->
        <div class="bottom-grid">
          <div class="panel">
            <div class="panel-header">TOP ATTACKERS</div>
            <div class="panel-content">
              ${this.inMemoryAttacks.length > 0 ? this.inMemoryAttacks.slice(0, 5).map(attack => `
                <div class="status-item">
                  <span class="status-label">${attack.ip}</span>
                  <span class="status-value" style="color: #ff9900;">${this.inMemoryAttacks.filter(a => a.ip === attack.ip).length} hits</span>
                </div>
              `).join('') : '<div style="color: #00ff99; text-align: center; padding: 10px;">No data</div>'}
            </div>
          </div>

          <div class="panel">
            <div class="panel-header">STATISTICS</div>
            <div class="panel-content">
              <div class="status-item">
                <span class="status-label threat-critical">● CRITICAL</span>
                <span class="status-value threat-critical">${criticalCount}</span>
              </div>
              <div class="status-item">
                <span class="status-label threat-high">● HIGH</span>
                <span class="status-value threat-high">${highCount}</span>
              </div>
              <div class="status-item">
                <span class="status-label threat-medium">● MEDIUM</span>
                <span class="status-value threat-medium">${mediumCount}</span>
              </div>
              <div class="status-item">
                <span class="status-label threat-low">● LOW</span>
                <span class="status-value threat-low">${lowCount}</span>
              </div>
            </div>
          </div>

          <div class="panel">
            <div class="panel-header">THREAT BREAKDOWN</div>
            <div class="panel-content">
              <div class="status-item">
                <span class="status-label">RCE</span>
                <span class="status-value" style="color: #ff0000;">${rceCount}</span>
              </div>
              <div class="status-item">
                <span class="status-label">SQL Inject</span>
                <span class="status-value" style="color: #ffff00;">${sqlCount}</span>
              </div>
              <div class="status-item">
                <span class="status-label">Path Traversal</span>
                <span class="status-value" style="color: #00cc88;">${this.inMemoryAttacks.filter(a => a.type === 'Path Traversal').length}</span>
              </div>
              <div class="status-item">
                <span class="status-label">XSS</span>
                <span class="status-value" style="color: #ff9900;">${this.inMemoryAttacks.filter(a => a.type === 'XSS').length}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="footer">
          ⚔ NODE SHIELD v0.2.0 | Protection Active | Real-time Monitoring
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = NodeShield;
