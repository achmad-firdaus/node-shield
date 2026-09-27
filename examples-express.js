// Example: Using Node Shield with Express
// Usage: node examples-express.js

const express = require('express');
const NodeShield = require('./index');

const app = express();
app.use(express.json());

// Add Node Shield middleware (requires express installed)
// Uncomment when express is available:
// app.use(NodeShield.expressMiddleware());

// For now, use the basic setup:
const shield = new NodeShield();

// Protection middleware
app.use((req, res, next) => {
  const query = req.query || {};
  const clientIP = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;

  for (const [key, value] of Object.entries(query)) {
    const str = String(value);
    if (shield.detectSQLInjection(str)) {
      shield.logAttack('SQL Injection', req.path, str, { param: key }, clientIP);
      return res.status(400).json({ error: 'Attack blocked' });
    }
    // ... check other types
  }
  next();
});

// Dashboard endpoint
app.get('/shield', (req, res) => {
  res.set('Content-Type', 'text/html');
  res.send(shield.getDashboardHTML());
});

// API endpoints
app.get('/api/shield/attacks', (req, res) => {
  res.json({ attacks: shield.getAttacks() });
});

app.get('/api/shield/stats', (req, res) => {
  res.json(shield.getStats());
});

// Example protected endpoint
app.get('/search', (req, res) => {
  const query = req.query.q || '';
  res.json({ results: [], query });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Express app with Node Shield running on http://localhost:${PORT}`);
  console.log(`📊 Dashboard at http://localhost:${PORT}/shield`);
});
