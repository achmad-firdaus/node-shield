#!/usr/bin/env node

const NodeShield = require('./shield');
const fs = require('fs');

const command = process.argv[2];
const shield = new NodeShield();

const commands = {
  stats: () => {
    const stats = shield.getStats();
    console.log('\n📊 Node Shield Statistics\n');
    console.log(`Total Attacks: ${stats.total}`);
    console.log(`Rate Limit Triggers: ${stats.rateLimit}`);
    console.log(`Last 24 Hours: ${stats.last24h}`);
    console.log('\nAttacks by Type:');
    Object.entries(stats.byType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    console.log('\nTop Attackers:');
    stats.topAttackers.forEach((att, i) => {
      console.log(`  ${i + 1}. ${att.ip} - ${att.count} attacks`);
    });
  },

  attacks: () => {
    const attacks = shield.getAttacks();
    console.log(`\n🔴 Recent Attacks (last 10)\n`);
    attacks.slice(-10).reverse().forEach(attack => {
      console.log(`[${attack.timestamp}] ${attack.type} from ${attack.ip}`);
      console.log(`  Endpoint: ${attack.endpoint}`);
      console.log(`  Payload: ${attack.payload}`);
      console.log('');
    });
  },

  reset: () => {
    shield.logs = [];
    shield.saveLogs();
    console.log('\n✅ Attack logs reset');
  },

  export: () => {
    const data = {
      timestamp: new Date().toISOString(),
      stats: shield.getStats(),
      attacks: shield.getAttacks()
    };
    const filename = `shield-export-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    console.log(`\n✅ Exported to ${filename}`);
  },

  help: () => {
    console.log(`
🛡️  Node Shield CLI

Usage: node cli.js [command]

Commands:
  stats     - Show attack statistics
  attacks   - Show recent attacks
  reset     - Clear attack logs
  export    - Export data to JSON file
  help      - Show this help message
    `);
  }
};

if (commands[command]) {
  commands[command]();
} else {
  console.log('Unknown command. Use: node cli.js help');
}
