-- 001_initial_schema.sql
-- Create attacks table and indexes

CREATE TABLE IF NOT EXISTS attacks (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL,
  type VARCHAR(50) NOT NULL,
  endpoint VARCHAR(255),
  payload TEXT,
  ip INET NOT NULL,
  blocked BOOLEAN DEFAULT true,
  severity VARCHAR(20),
  details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_attacks_timestamp ON attacks(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_attacks_ip ON attacks(ip);
CREATE INDEX IF NOT EXISTS idx_attacks_type ON attacks(type);
CREATE INDEX IF NOT EXISTS idx_attacks_severity ON attacks(severity);
CREATE INDEX IF NOT EXISTS idx_attacks_created_at ON attacks(created_at DESC);

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO shield_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO shield_user;
