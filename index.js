const NodeShield = require('./shield');

// Export the shield class for use as a middleware
module.exports = NodeShield;

// Export a helper to create Express middleware
module.exports.expressMiddleware = function(options = {}) {
  const shield = new NodeShield();

  return (req, res, next) => {
    const query = req.query || {};
    const params = { ...query, ...req.body };

    // Get client IP
    const clientIP = req.headers['x-forwarded-for']?.split(',')[0] ||
                     req.headers['x-real-ip'] ||
                     req.socket.remoteAddress || '0.0.0.0';

    // Check for attacks in all parameters
    for (const [key, value] of Object.entries(params)) {
      const strValue = String(value);

      if (shield.detectSQLInjection(strValue)) {
        shield.logAttack('SQL Injection', req.path, strValue, { param: key }, clientIP);
        return res.status(400).json({ error: 'Attack detected and blocked' });
      }
      if (shield.detectRCE(strValue)) {
        shield.logAttack('RCE', req.path, strValue, { param: key }, clientIP);
        return res.status(400).json({ error: 'Attack detected and blocked' });
      }
      if (shield.detectPathTraversal(strValue)) {
        shield.logAttack('Path Traversal', req.path, strValue, { param: key }, clientIP);
        return res.status(400).json({ error: 'Attack detected and blocked' });
      }
      if (shield.detectCommandInjection(strValue)) {
        shield.logAttack('Command Injection', req.path, strValue, { param: key }, clientIP);
        return res.status(400).json({ error: 'Attack detected and blocked' });
      }
      if (shield.detectXSS(strValue)) {
        shield.logAttack('XSS', req.path, strValue, { param: key }, clientIP);
        return res.status(400).json({ error: 'Attack detected and blocked' });
      }
      if (shield.detectNoSQLInjection(strValue)) {
        shield.logAttack('NoSQL Injection', req.path, strValue, { param: key }, clientIP);
        return res.status(400).json({ error: 'Attack detected and blocked' });
      }
      if (shield.detectXXE(strValue)) {
        shield.logAttack('XXE', req.path, strValue, { param: key }, clientIP);
        return res.status(400).json({ error: 'Attack detected and blocked' });
      }
      if (shield.detectLDAPInjection(strValue)) {
        shield.logAttack('LDAP Injection', req.path, strValue, { param: key }, clientIP);
        return res.status(400).json({ error: 'Attack detected and blocked' });
      }
    }

    // Attach shield instance for dashboard endpoints
    req.shield = shield;
    next();
  };
};

// Export for creating standalone server
module.exports.createServer = function(port = 3000) {
  const http = require('http');
  const url = require('url');
  const shield = new NodeShield();

  const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (pathname === '/' || pathname === '/dashboard') {
      res.setHeader('Content-Type', 'text/html');
      res.writeHead(200);
      res.end(shield.getDashboardHTML());
    } else if (pathname === '/api/attacks') {
      res.writeHead(200);
      res.end(JSON.stringify({ attacks: shield.getAttacks() }));
    } else if (pathname === '/api/stats') {
      res.writeHead(200);
      res.end(JSON.stringify(shield.getStats()));
    } else if (pathname === '/api/reset' && req.method === 'POST') {
      shield.logs = [];
      shield.saveLogs();
      res.writeHead(200);
      res.end(JSON.stringify({ message: 'Reset successful' }));
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });

  server.listen(port, () => {
    console.log(`🛡️  Node Shield running on http://localhost:${port}`);
  });

  return server;
};
