# Node Shield Testing Guide

## 15-Minute Self-Healing Stress Test

### Overview

The `test-docker-15min.sh` script runs a comprehensive 15-minute attack injection test against Node Shield with automatic Docker self-healing. If any test fails within the 15-minute window, the entire Docker stack is restarted and the timer resets.

### Requirements

- Docker & Docker Compose installed
- Node Shield running via `docker-compose up`
- curl available in PATH
- bash shell

### Running the Test

**Option 1: Quick Start (from project root)**
```bash
./test-docker-15min.sh
```

**Option 2: With automatic docker-compose startup**
```bash
docker-compose up -d && ./test-docker-15min.sh
```

**Option 3: Custom port**
```bash
PORT=8080 ./test-docker-15min.sh
```

### Test Coverage

**Query Parameter Attacks (9 tests)**
- SQL UNION SELECT
- SQL DROP TABLE
- SQL OR conditions
- XSS Script tags
- XSS Event handlers
- Path Traversal (basic & encoded)
- Command Injection (pipe & AND operators)

**POST Body Attacks (4 tests)**
- SQL injection in JSON
- XSS in request body
- RCE payload detection
- Command execution attempts

**Valid Requests (2 tests)**
- Clean search query (should pass)
- Normal query with limit parameter

**Total: 15 attack vectors per test cycle**

### Test Cycle

1. **Health Check** — Verifies API responds to `/api/stats`
2. **Attack Injection** — Tests 15 different attack vectors
3. **Validation** — Verifies all attacks return HTTP 400 (blocked)
4. **Clean Requests** — Verifies legitimate requests return HTTP 200

**Cycle Duration:** ~30 seconds

**Cycles needed for 15-minute success:** 30 consecutive cycles

### Auto-Healing Behavior

If any test fails:
1. ⚠️ Failure logged with timestamp
2. 🔄 Full docker-compose restart triggered
3. ⏱️ 15-minute timer **resets to 0:00**
4. 📊 Test statistics cleared
5. 🔄 Test resumes after 5-second Docker startup delay

**This means:** You must have **30 consecutive successful test cycles** (15 minutes) with zero failures.

### Sample Output

**Startup**
```
🛡️  NODE SHIELD 15-MINUTE SELF-HEALING TEST
Starting docker-compose verification...

=== Comprehensive Attack Injection Tests ===
Time: 14:30:45

Query Parameter Tests:
✓ SQL UNION SELECT (HTTP 400)
✓ SQL DROP TABLE (HTTP 400)
✓ SQL OR condition (HTTP 400)
...
```

**Progress**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ All tests passing - 5:30/15:00
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Failure & Recovery**
```
⚠️  API health check failed at 14:35:22
🔄 Restarting docker-compose...
[Docker restarts...]
⏱️  Timer reset to 0:00
```

**Success**
```
╔════════════════════════════════════════════════════════════╗
║     ✅ 15 MINUTE TEST COMPLETED SUCCESSFULLY              ║
║  All attack vectors blocked consistently for 15 minutes    ║
╚════════════════════════════════════════════════════════════╝
Total: 450 | Passed: 450 | Failed: 0
```

### Monitoring During Test

**In another terminal, watch logs:**
```bash
# View application logs
tail -f logs/node-shield-*.log

# Monitor database
docker-compose logs -f postgres

# Check container health
watch 'docker-compose ps'
```

### Interpreting Results

| Result | Meaning | Action |
|--------|---------|--------|
| ✓ All tests passing | Attack detection working | Continue monitoring |
| ✗ Test failures | Detection failed or API down | Timer resets, docker restarts |
| ⚠️ Health check failed | Cannot reach API | Automatic docker restart |
| Timer resets | Test failure detected | Check logs for root cause |

### Common Issues

**"Address already in use"**
```bash
# Kill process on port 3001
lsof -ti :3001 | xargs kill -9

# Or use different port
PORT=8080 ./test-docker-15min.sh
```

**"Cannot connect to Docker daemon"**
```bash
# Start Docker
docker-compose up -d

# Verify services
docker-compose ps
```

**Tests failing immediately**
```bash
# Check database is initialized
docker-compose logs postgres

# Check Node Shield is healthy
curl http://localhost:3001/api/health

# View application logs
docker-compose logs node-shield
```

**Stuck at certain percentage**
- This is expected — some cycles take longer
- Script runs test every 30 seconds
- No timer advancement during failures
- Patience is required for clean 15 minutes

### Test Metrics

After successful run, you'll see:
- **Total Tests:** 450 (30 cycles × 15 tests)
- **Passed:** All 450
- **Failed:** 0
- **Uptime:** 15 consecutive minutes
- **Recovery Events:** Number of docker restarts needed

### Performance Expectations

**Under load (15-min test)**
- Average response time: <100ms
- Throughput: ~450 requests in 15 minutes
- CPU usage: Moderate
- Memory usage: Stable (no leaks)
- Database: Persistent across restarts

### What Gets Tested

✅ Attack detection across 8 vectors
✅ HTTP 400 response for attacks
✅ HTTP 200 response for clean requests
✅ API health endpoint availability
✅ Database connectivity
✅ Docker auto-recovery
✅ Timer reset on failures
✅ 15-minute sustained operation

### Why 15 Minutes?

- Long enough to detect memory leaks
- Long enough for connection pool saturation
- Long enough for log rotation
- Short enough for iterative testing
- Matches production stress test requirements

### Extended Testing

**For 30-minute test** (2 back-to-back 15-min runs):
```bash
./test-docker-15min.sh && ./test-docker-15min.sh
```

**For 1-hour endurance test:**
```bash
for i in {1..4}; do
  echo "Run $i/4..."
  ./test-docker-15min.sh || break
  sleep 30
done
```

### Debugging Failed Tests

**If tests fail, check:**

1. **Application logs:**
   ```bash
   tail -50 logs/node-shield-*.log | grep -E "ERROR|CRITICAL"
   ```

2. **Database status:**
   ```bash
   docker-compose exec postgres psql -U shield_user node_shield -c "SELECT COUNT(*) FROM attacks;"
   ```

3. **Network connectivity:**
   ```bash
   curl -v http://localhost:3001/api/stats
   ```

4. **Attack detection logic:**
   ```bash
   # Test manual attack
   curl "http://localhost:3001/?q=UNION SELECT"
   # Should return HTTP 400
   ```

### Success Criteria

✅ Script completes with "15 MINUTE TEST COMPLETED SUCCESSFULLY"
✅ All 450 tests pass (15 per cycle × 30 cycles)
✅ Zero failed tests reported
✅ No unexpected Docker restarts
✅ Application remains responsive throughout
