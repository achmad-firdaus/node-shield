const express = require('express');
const NodeShield = require('./shield');

const app = express();
const shield = new NodeShield();

app.use(express.json());
app.use(shield.middleware());

const mockDatabase = {
  users: [
    { id: 1, username: 'admin', password: 'secret123' },
    { id: 2, username: 'user', password: 'pass456' }
  ]
};

// Vulnerable endpoints for testing
app.get('/search', (req, res) => {
  const query = req.query.q || '';
  const results = mockDatabase.users.filter(u => u.username.includes(query));
  res.json({ results, query });
});

app.get('/execute', (req, res) => {
  const cmd = req.query.cmd || '';
  res.json({ error: 'This is a demo endpoint. Command execution is disabled.' });
});

app.get('/file', (req, res) => {
  const file = req.query.file || '';
  res.json({ error: 'File access is disabled for security reasons.' });
});

// Dashboard
app.get('/', (req, res) => {
  res.send(shield.getDashboardHTML());
});

// API endpoint for dashboard
app.get('/api/attacks', (req, res) => {
  res.json({ attacks: shield.getAttacks() });
});

// API endpoint for stats
app.get('/api/stats', async (req, res) => {
  const stats = await shield.getStats();
  res.json(stats);
});

// Reset attacks
app.post('/api/reset', (req, res) => {
  shield.logs = [];
  shield.saveLogs();
  res.json({ message: 'Attacks log reset' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🛡️  Node Shield is running on http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log('');
  console.log('Try these attack scenarios:');
  console.log(`  SQL Injection: curl "http://localhost:${PORT}/search?q=admin' UNION SELECT 1,2,3--"`);
  console.log(`  RCE: curl "http://localhost:${PORT}/execute?cmd=require('child_process').exec('ls')"`);
  console.log(`  Path Traversal: curl "http://localhost:${PORT}/file?file=../../etc/passwd"`);
});
