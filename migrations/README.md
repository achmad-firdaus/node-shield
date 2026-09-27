# Database Migrations

This directory contains versioned database schema changes.

## How It Works

1. Each migration is a numbered SQL file (e.g., `001_initial_schema.sql`, `002_add_column.sql`)
2. Files are applied in numeric order
3. `migrate.js` tracks which migrations have been applied in the `migrations` table
4. Safe to run multiple times—applied migrations are skipped

## Creating a New Migration

1. Determine the next number:
   ```bash
   ls migrations/ | sort
   # Output: 001_initial_schema.sql
   # Next number: 002
   ```

2. Create your migration file:
   ```bash
   touch migrations/002_add_request_body.sql
   ```

3. Write your SQL (remember: idempotent, use `IF NOT EXISTS` etc.):
   ```sql
   -- 002_add_request_body.sql
   ALTER TABLE attacks ADD COLUMN IF NOT EXISTS request_body TEXT;
   CREATE INDEX IF NOT EXISTS idx_attacks_request_body ON attacks(request_body);
   ```

4. Test locally or in Docker:
   ```bash
   npm run migrate
   ```

## Running Migrations

### Local Development
```bash
DB_HOST=localhost npm run migrate
```

### Docker
Migrations run automatically when `docker-compose up` starts (see docker-compose.yml).

### Manual (if needed)
```bash
node migrate.js
```

## Rollback (Manual Process)

The system doesn't auto-rollback. To undo a migration:

1. Create a new migration with the reverse change:
   ```sql
   -- 003_remove_request_body.sql
   ALTER TABLE attacks DROP COLUMN IF EXISTS request_body;
   DROP INDEX IF EXISTS idx_attacks_request_body;
   ```

2. Run migrations:
   ```bash
   npm run migrate
   ```

3. (Optional) Delete the old migration file from git history (for clean history).

## Best Practices

- ✅ Use `IF NOT EXISTS` / `IF EXISTS` for idempotency
- ✅ Keep migrations small and focused
- ✅ Document what each migration does with comments
- ✅ Test migrations before committing
- ✅ Use descriptive names: `002_add_severity_index.sql`
- ❌ Don't alter existing migrations (always create new ones)
- ❌ Don't manually edit the `migrations` table
