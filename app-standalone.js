const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const NodeShield = require('./shield');

const shield = new NodeShield();
const mockDatabase = {
  users: [
    { id: 1, username: 'admin', password: 'secret123' },
    { id: 2, username: 'user', password: 'pass456' }
  ]
};

let dashboardHTML = null;

// Configuration from environment
const config = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  apiKey: process.env.API_KEY || 'development-key-not-for-production',
  enableAuth: process.env.ENABLE_AUTH !== 'false',
  corsEnabled: process.env.CORS_ENABLED === 'true',
  corsOrigin: process.env.CORS_ORIGIN || 'localhost,127.0.0.1',
  logFormat: process.env.LOG_FORMAT || 'text',
  verbose: process.env.VERBOSE_LOGGING === 'true'
};

// Simple structured logger
function log(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...(config.verbose && data)
  };

  if (config.logFormat === 'json') {
    console.log(JSON.stringify(logEntry));
  } else {
    console.log(`[${timestamp}] [${level}] ${message}${config.verbose && Object.keys(data).length ? ' ' + JSON.stringify(data) : ''}`);
  }
}

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip']?.trim() ||
         req.socket.remoteAddress ||
         '0.0.0.0';
}

function validateAPIKey(req) {
  if (!config.enableAuth) return true;
  if (config.apiKey === 'development-key-not-for-production' && config.nodeEnv === 'development') return true;

  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  return apiKey && apiKey === config.apiKey;
}

function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data:; font-src 'self' https://fonts.gstatic.com;");

  if (config.corsEnabled) {
    const origin = req.headers.origin;
    if (origin && config.corsOrigin.split(',').map(o => o.trim()).includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, Authorization');
}

function parseBodyData(req) {
  return new Promise((resolve) => {
    let body = '';
    const maxBodySize = 1e6;

    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > maxBodySize) {
        req.connection.destroy();
        resolve(null);
      }
    });

    req.on('end', () => {
      try {
        if (req.headers['content-type']?.includes('application/json')) {
          resolve(JSON.parse(body));
        } else if (req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
          const params = new URLSearchParams(body);
          resolve(Object.fromEntries(params));
        } else {
          resolve({ raw: body });
        }
      } catch (err) {
        log('warn', 'Body parse error', { error: err.message });
        resolve(null);
      }
    });
  });
}

function checkAttacksInData(data, shield, pathname, clientIP, res) {
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      const attackType = shield.detectAttack(value);
      if (attackType) {
        shield.logAttack(attackType, pathname, value, { param: key, source: 'body' }, clientIP);
        res.writeHead(400);
        res.end(JSON.stringify({ error: `${attackType} detected and blocked` }));
        return true;
      }
    }
  }
  return false;
}

function scanHeaders(headers, shield, pathname, clientIP, res) {
  const headersToCheck = [
    'user-agent', 'referer', 'cookie', 'authorization',
    'x-forwarded-for', 'x-original-url', 'x-rewrite-url', 'content-type'
  ];

  for (const headerName of headersToCheck) {
    const headerValue = headers[headerName];
    if (headerValue && typeof headerValue === 'string') {
      const attackType = shield.detectAttack(headerValue);
      if (attackType) {
        shield.logAttack(attackType, pathname, headerValue, { source: 'header', header: headerName }, clientIP);
        res.writeHead(400);
        res.end(JSON.stringify({ error: `${attackType} in header detected and blocked` }));
        return true;
      }
    }
  }
  return false;
}

const server = http.createServer(async (req, res) => {
  try {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const query = parsedUrl.query;
    const clientIP = getClientIP(req);

    // Set security headers
    setSecurityHeaders(res);

    // Handle OPTIONS requests for CORS
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Handle favicon
    if (pathname === '/favicon.ico') {
      res.writeHead(204);
      res.end();
      return;
    }

    res.setHeader('Content-Type', 'application/json');

    // Log incoming request
    log('info', `${req.method} ${pathname}`, { ip: clientIP, userAgent: req.headers['user-agent'] });

    // Skip attack detection for dashboard and API routes (User-Agent causes false positives)
    const isDashboard = pathname === '/' || pathname === '/dashboard';
    const isAPIRoute = pathname.startsWith('/api/');

    // Scan headers first (skip for dashboard and API routes)
    if (!isDashboard && !isAPIRoute && scanHeaders(req.headers, shield, pathname, clientIP, res)) {
      return;
    }

    // Scan all query parameters for attacks
    for (const [param, value] of Object.entries(query)) {
      if (typeof value === 'string') {
        const attackType = shield.detectAttack(value);
        if (attackType) {
          shield.logAttack(attackType, pathname, value, { param, source: 'query' }, clientIP);
          res.writeHead(400);
          res.end(JSON.stringify({ error: `${attackType} detected and blocked` }));
          return;
        }
      }
    }

    // Parse and check request body for POST requests
    if ((req.method === 'POST' || req.method === 'PUT') && pathname !== '/api/whitelist' && pathname !== '/api/blacklist') {
      try {
        const bodyData = await parseBodyData(req);
        if (checkAttacksInData(bodyData, shield, pathname, clientIP, res)) {
          return;
        }
      } catch (err) {
        console.error('[BODY PARSE ERROR]', err.message);
      }
    }

  // Route handlers
  if (pathname === '/' || pathname === '/dashboard') {
    res.setHeader('Content-Type', 'text/html');

    // Load dashboard HTML if not cached
    if (!dashboardHTML) {
      try {
        dashboardHTML = fs.readFileSync(path.join(__dirname, 'dashboard-as400pro.html'), 'utf8');
      } catch (err) {
        console.error('[DASHBOARD ERROR]', err.message);
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Dashboard not found' }));
        return;
      }
    }

    res.writeHead(200);
    res.end(dashboardHTML);
  } else if (pathname === '/api/attacks') {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 100;

    Promise.all([
      shield.getAttacks(page, limit),
      shield.getTotalAttacks()
    ]).then(([attacks, total]) => {
      // Add attack number based on total count (latest = highest number)
      const startNum = total - (page - 1) * limit;
      const attacksWithNumbers = attacks.map((attack, idx) => ({
        ...attack,
        num: startNum - idx
      }));

      res.writeHead(200);
      res.end(JSON.stringify({
        attacks: attacksWithNumbers,
        total: total,
        page: page,
        limit: limit,
        pages: Math.ceil(total / limit)
      }));
    }).catch(err => {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Database error' }));
    });
  } else if (pathname === '/api/stats') {
    shield.getStats().then(stats => {
      res.writeHead(200);
      res.end(JSON.stringify(stats));
    }).catch(err => {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Database error' }));
    });
  } else if (pathname === '/api/count') {
    shield.getTotalAttacks().then(total => {
      res.writeHead(200);
      res.end(JSON.stringify({ total }));
    }).catch(err => {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Database error' }));
    });
  } else if (pathname === '/api/health') {
    const healthScore = shield.calculateHealthScore();
    const threatLevel = shield.calculateThreatLevel();
    res.writeHead(200);
    res.end(JSON.stringify({ healthScore, threatLevel }));
  } else if (pathname === '/api/top-attackers') {
    if (shield.useInMemoryDB) {
      const ipCounts = {};
      shield.inMemoryAttacks.forEach(attack => {
        ipCounts[attack.ip] = (ipCounts[attack.ip] || 0) + 1;
      });
      const topAttackers = Object.entries(ipCounts)
        .map(([ip, count]) => ({ ip, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      res.writeHead(200);
      res.end(JSON.stringify({ topAttackers }));
    } else if (shield.pool) {
      shield.pool.query(
        `SELECT ip, COUNT(*) as count FROM attacks GROUP BY ip ORDER BY count DESC LIMIT 5`
      ).then(result => {
        const topAttackers = result.rows.map(row => ({
          ip: row.ip,
          count: parseInt(row.count)
        }));
        res.writeHead(200);
        res.end(JSON.stringify({ topAttackers }));
      }).catch(err => {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Database error' }));
      });
    } else {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Database not available' }));
    }
  } else if (pathname === '/api/statistics') {
    if (shield.useInMemoryDB) {
      const byType = {};
      shield.inMemoryAttacks.forEach(attack => {
        byType[attack.type] = (byType[attack.type] || 0) + 1;
      });
      res.writeHead(200);
      res.end(JSON.stringify({ byType }));
    } else if (shield.pool) {
      shield.pool.query(
        `SELECT type, COUNT(*) as count FROM attacks GROUP BY type ORDER BY count DESC`
      ).then(result => {
        const byType = {};
        result.rows.forEach(row => {
          byType[row.type] = parseInt(row.count);
        });
        res.writeHead(200);
        res.end(JSON.stringify({ byType }));
      }).catch(err => {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Database error' }));
      });
    } else {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Database not available' }));
    }
  } else if (pathname === '/api/severity-stats') {
    if (shield.useInMemoryDB) {
      const bySeverity = {};
      shield.inMemoryAttacks.forEach(attack => {
        bySeverity[attack.severity] = (bySeverity[attack.severity] || 0) + 1;
      });
      res.writeHead(200);
      res.end(JSON.stringify({ bySeverity }));
    } else if (shield.pool) {
      shield.pool.query(
        `SELECT severity, COUNT(*) as count FROM attacks GROUP BY severity ORDER BY count DESC`
      ).then(result => {
        const bySeverity = {};
        result.rows.forEach(row => {
          bySeverity[row.severity] = parseInt(row.count);
        });
        res.writeHead(200);
        res.end(JSON.stringify({ bySeverity }));
      }).catch(err => {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Database error' }));
      });
    } else {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Database not available' }));
    }
  } else if (pathname === '/api/timeline-data') {
    if (shield.useInMemoryDB) {
      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      const timeline = {};

      shield.inMemoryAttacks.forEach(attack => {
        const attackTime = new Date(attack.timestamp).getTime();
        if (attackTime >= oneDayAgo) {
          const bucket = new Date(attackTime);
          bucket.setSeconds(0, 0);
          const key = bucket.toISOString();
          timeline[key] = (timeline[key] || 0) + 1;
        }
      });

      const result = Object.entries(timeline)
        .map(([timestamp, count]) => ({ timestamp, count }))
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      res.writeHead(200);
      res.end(JSON.stringify({ timeline: result }));
    } else if (shield.pool) {
      shield.pool.query(
        `SELECT
          DATE_TRUNC('minute', timestamp) as time_bucket,
          COUNT(*) as count
        FROM attacks
        WHERE timestamp > NOW() - INTERVAL '24 hours'
        GROUP BY DATE_TRUNC('minute', timestamp)
        ORDER BY time_bucket ASC`
      ).then(result => {
        const timeline = result.rows.map(row => ({
          timestamp: row.time_bucket,
          count: parseInt(row.count)
        }));
        res.writeHead(200);
        res.end(JSON.stringify({ timeline }));
      }).catch(err => {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Database error' }));
      });
    } else {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Database not available' }));
    }
  } else if (pathname === '/api/timeline') {
    const interval = query.interval || 'minute';
    const intervalMs = interval === 'hour' ? 3600000 : 60000;

    shield.pool.query(
      `SELECT
        DATE_TRUNC('${interval}', timestamp) as time_bucket,
        COUNT(*) as count
      FROM attacks
      WHERE timestamp > NOW() - INTERVAL '1 hour'
      GROUP BY DATE_TRUNC('${interval}', timestamp)
      ORDER BY time_bucket ASC`
    ).then(result => {
      const timeline = result.rows.map(row => ({
        timestamp: row.time_bucket,
        count: parseInt(row.count)
      }));
      res.writeHead(200);
      res.end(JSON.stringify({ timeline }));
    }).catch(err => {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Database error' }));
    });
  } else if (pathname === '/api/whitelist') {
    if (!validateAPIKey(req) && config.enableAuth) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: 'Unauthorized: Invalid or missing API key' }));
      return;
    }

    if (req.method === 'GET') {
      const whitelist = {
        ips: Array.from(shield.whitelistIPs),
        patterns: Array.from(shield.whitelistPatterns)
      };
      res.writeHead(200);
      res.end(JSON.stringify(whitelist));
    } else if (req.method === 'POST') {
      const bodyData = await parseBodyData(req);
      if (!bodyData) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid request body' }));
        return;
      }
      const { type, value } = bodyData;
      if (!type || !value) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Missing type or value' }));
        return;
      }
      if (type === 'ip') {
        shield.addIPToWhitelist(value);
        log('info', `IP added to whitelist: ${value}`);
        res.writeHead(200);
        res.end(JSON.stringify({ message: `IP ${value} added to whitelist` }));
      } else if (type === 'pattern') {
        shield.addPatternToWhitelist(value);
        log('info', `Pattern added to whitelist: ${value}`);
        res.writeHead(200);
        res.end(JSON.stringify({ message: `Pattern "${value}" added to whitelist` }));
      } else {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid type. Use "ip" or "pattern"' }));
      }
    } else if (req.method === 'DELETE') {
      const bodyData = await parseBodyData(req);
      if (!bodyData) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid request body' }));
        return;
      }
      const { type, value } = bodyData;
      if (!type || !value) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Missing type or value' }));
        return;
      }
      if (type === 'ip') {
        shield.removeIPFromWhitelist(value);
        log('info', `IP removed from whitelist: ${value}`);
        res.writeHead(200);
        res.end(JSON.stringify({ message: `IP ${value} removed from whitelist` }));
      } else if (type === 'pattern') {
        shield.removePatternFromWhitelist(value);
        log('info', `Pattern removed from whitelist: ${value}`);
        res.writeHead(200);
        res.end(JSON.stringify({ message: `Pattern "${value}" removed from whitelist` }));
      } else {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid type. Use "ip" or "pattern"' }));
      }
    }
  } else if (pathname === '/api/blacklist') {
    if (!validateAPIKey(req) && config.enableAuth) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: 'Unauthorized: Invalid or missing API key' }));
      return;
    }

    if (req.method === 'GET') {
      const blacklist = {
        ips: Array.from(shield.blacklistIPs),
        patterns: Array.from(shield.blacklistPatterns)
      };
      res.writeHead(200);
      res.end(JSON.stringify(blacklist));
    } else if (req.method === 'POST') {
      const bodyData = await parseBodyData(req);
      if (!bodyData) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid request body' }));
        return;
      }
      const { type, value } = bodyData;
      if (!type || !value) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Missing type or value' }));
        return;
      }
      if (type === 'ip') {
        shield.addIPToBlacklist(value);
        log('warn', `IP added to blacklist: ${value}`);
        res.writeHead(200);
        res.end(JSON.stringify({ message: `IP ${value} added to blacklist` }));
      } else if (type === 'pattern') {
        shield.addPatternToBlacklist(value);
        log('warn', `Pattern added to blacklist: ${value}`);
        res.writeHead(200);
        res.end(JSON.stringify({ message: `Pattern "${value}" added to blacklist` }));
      } else {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid type. Use "ip" or "pattern"' }));
      }
    } else if (req.method === 'DELETE') {
      const bodyData = await parseBodyData(req);
      if (!bodyData) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid request body' }));
        return;
      }
      const { type, value } = bodyData;
      if (!type || !value) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Missing type or value' }));
        return;
      }
      if (type === 'ip') {
        shield.removeIPFromBlacklist(value);
        log('info', `IP removed from blacklist: ${value}`);
        res.writeHead(200);
        res.end(JSON.stringify({ message: `IP ${value} removed from blacklist` }));
      } else if (type === 'pattern') {
        shield.removePatternFromBlacklist(value);
        log('info', `Pattern removed from blacklist: ${value}`);
        res.writeHead(200);
        res.end(JSON.stringify({ message: `Pattern "${value}" removed from blacklist` }));
      } else {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid type. Use "ip" or "pattern"' }));
      }
    }
  } else if (pathname === '/api/reset' && req.method === 'POST') {
    if (!validateAPIKey(req) && config.enableAuth) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: 'Unauthorized: Invalid or missing API key' }));
      return;
    }

    shield.inMemoryAttacks = [];
    log('warn', 'Attacks log reset by admin');
    res.writeHead(200);
    res.end(JSON.stringify({ message: 'Attacks log reset' }));
  } else if (pathname === '/search') {
    const q = query.q || '';
    const results = mockDatabase.users.filter(u => u.username.includes(q));
    res.writeHead(200);
    res.end(JSON.stringify({ results, query: q }));
  } else if (pathname === '/execute') {
    res.writeHead(200);
    res.end(JSON.stringify({ error: 'This is a demo endpoint. Command execution is disabled.' }));
  } else if (pathname === '/file') {
    res.writeHead(200);
    res.end(JSON.stringify({ error: 'File access is disabled for security reasons.' }));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
  } catch (err) {
    console.error('[ERROR]', err.message);
    if (!res.headersSent) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  }
});

function generateAPIKey() {
  return crypto.randomBytes(32).toString('hex');
}

// Graceful shutdown
process.on('SIGTERM', () => {
  log('info', 'SIGTERM signal received: closing HTTP server');
  server.close(() => {
    log('info', 'HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  log('info', 'SIGINT signal received: closing HTTP server');
  server.close(() => {
    log('info', 'HTTP server closed');
    process.exit(0);
  });
});

server.listen(config.port, () => {
  log('info', `🛡️  Node Shield is running on http://localhost:${config.port}`);
  log('info', `📊 Dashboard: http://localhost:${config.port}`);

  if (config.enableAuth && config.apiKey === 'development-key-not-for-production' && config.nodeEnv === 'production') {
    log('warn', '⚠️  SECURITY WARNING: Using default API key. Set API_KEY environment variable!');
    log('warn', `    Generate one: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`);
  } else if (config.enableAuth) {
    log('info', `🔐 API Authentication: ENABLED (API_KEY=${config.apiKey.substring(0, 8)}...)`);
  }

  log('info', `📝 Configuration: NODE_ENV=${config.nodeEnv}, CORS=${config.corsEnabled ? 'enabled' : 'disabled'}`);
  log('info', '');
  log('info', 'Try these attack scenarios:');
  log('info', `  SQL Injection: curl "http://localhost:${config.port}/search?q=admin' UNION SELECT 1,2,3--"`);
  log('info', `  RCE: curl "http://localhost:${config.port}/execute?cmd=require('child_process').exec('ls')"`);
  log('info', `  Path Traversal: curl "http://localhost:${config.port}/file?file=../../etc/passwd"`);
  log('info', '');
  log('info', 'Protected endpoints (require API key):');
  log('info', `  POST /api/reset -H "X-API-Key: YOUR_API_KEY"`);
  log('info', `  POST /api/whitelist -H "X-API-Key: YOUR_API_KEY"`);
  log('info', `  POST /api/blacklist -H "X-API-Key: YOUR_API_KEY"`);
  log('info', '');
  log('info', 'Press Ctrl+C to stop');
});
