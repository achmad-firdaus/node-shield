#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'node_shield',
  user: process.env.DB_USER || 'shield_user',
  password: process.env.DB_PASSWORD || 'shield_password'
});

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function createMigrationsTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await pool.query(query);
}

async function getAppliedMigrations() {
  const result = await pool.query('SELECT name FROM migrations ORDER BY name');
  return result.rows.map(row => row.name);
}

async function getMigrationFiles() {
  const files = fs.readdirSync(MIGRATIONS_DIR);
  return files
    .filter(f => f.endsWith('.sql'))
    .sort();
}

async function applyMigration(filename) {
  const filePath = path.join(MIGRATIONS_DIR, filename);
  const sql = fs.readFileSync(filePath, 'utf8');

  console.log(`\n📦 Running: ${filename}`);

  try {
    await pool.query(sql);
    await pool.query(
      'INSERT INTO migrations (name) VALUES ($1)',
      [filename]
    );
    console.log(`✅ Applied: ${filename}`);
    return true;
  } catch (err) {
    console.error(`❌ Failed: ${filename}`);
    console.error(`   Error: ${err.message}`);
    return false;
  }
}

async function migrate() {
  try {
    console.log('🔄 Node Shield Database Migration\n');

    // Create migrations tracking table
    await createMigrationsTable();
    console.log('✓ Migrations table ready');

    // Get applied and available migrations
    const applied = await getAppliedMigrations();
    const available = await getMigrationFiles();
    const pending = available.filter(f => !applied.includes(f));

    console.log(`\n📊 Status:`);
    console.log(`   Applied: ${applied.length}`);
    console.log(`   Pending: ${pending.length}`);

    if (pending.length === 0) {
      console.log('\n✅ Database is up-to-date!');
      await pool.end();
      process.exit(0);
    }

    // Run pending migrations
    console.log(`\n🚀 Running ${pending.length} migration(s)...`);
    let failed = false;

    for (const migration of pending) {
      const success = await applyMigration(migration);
      if (!success) {
        failed = true;
        break;
      }
    }

    if (!failed) {
      console.log('\n✨ All migrations applied successfully!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Migration stopped due to error');
      process.exit(1);
    }
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migrations
migrate();
