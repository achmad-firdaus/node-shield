# Node Shield Test Suite

This directory contains comprehensive unit and integration tests for the Node Shield security library.

## Test Structure

```
__tests__/
├── setup.js                 # Jest setup and environment configuration
├── shield.test.js          # Unit tests for detection methods
├── app-standalone.test.js  # Integration tests for HTTP server
└── README.md              # This file
```

## Running Tests

### All Tests
```bash
npm test
```

This runs all tests with coverage reporting.

### Watch Mode (for development)
```bash
npm run test:watch
```

Automatically reruns tests when files change.

### With Coverage Report
```bash
npm test
```

Coverage report is generated in `coverage/` directory.

### Specific Test File
```bash
npm test -- __tests__/shield.test.js
```

### Integration Tests
```bash
npm run test:integration
```

This runs the basic HTTP test against a running server.

## Test Coverage

Current targets:
- **Branches:** 70%
- **Functions:** 70%
- **Lines:** 70%
- **Statements:** 70%

Check current coverage:
```bash
npm test -- --coverage
```

## Unit Tests (shield.test.js)

Tests the `NodeShield` class and its detection methods:

### Detection Methods Tested
- **SQL Injection** — UNION SELECT, OR conditions, comments, multi-statement
- **Remote Code Execution (RCE)** — eval(), require(), child_process
- **Path Traversal** — ../ sequences, multiple traversals
- **Cross-Site Scripting (XSS)** — script tags, event handlers, javascript: protocol
- **Command Injection** — pipes, ampersands, backticks, $(...)
- **NoSQL Injection** — MongoDB operators, $where, JSON payloads
- **XML External Entity (XXE)** — DOCTYPE, ENTITY, XML entities
- **LDAP Injection** — wildcards, filter syntax, OR conditions

### Coverage Areas
- Detection accuracy (true positives and negatives)
- Severity classification
- Attack logging and data structure
- IP rate limiting tracking
- In-memory storage functionality

## Integration Tests (app-standalone.test.js)

Tests the HTTP server functionality:
- API endpoints (/api/attacks, /api/stats, /api/count, /api/reset)
- Attack detection in request parameters
- Dashboard HTML serving
- HTML caching mechanism

**Note:** These tests are structured but require the server to be running.

## Test Environment

### Environment Variables
When tests run, these variables are automatically set:

```
NODE_ENV=test
DB_HOST=localhost
DB_PORT=5432
DB_NAME=node_shield_test
DB_USER=shield_user
DB_PASSWORD=shield_password
```

### PostgreSQL for Testing

If running with PostgreSQL:

```bash
# Start PostgreSQL (Docker)
docker-compose up -d postgres

# Run tests
npm test

# Stop PostgreSQL
docker-compose down
```

### In-Memory Mode (Default)

Tests run with in-memory storage by default if DB_HOST is not set. This is faster and doesn't require a database.

## Writing New Tests

### Example Unit Test
```javascript
describe('My Feature', () => {
  let shield;

  beforeEach(() => {
    shield = new NodeShield();
  });

  it('should detect my attack pattern', () => {
    const result = shield.detectMyAttack('malicious input');
    expect(result).toBe(true);
  });

  it('should pass normal input', () => {
    const result = shield.detectMyAttack('normal input');
    expect(result).toBe(false);
  });
});
```

### Test Guidelines
1. **Descriptive names** — `it('should detect UNION-based SQL injection')` not `it('works')`
2. **Single assertion** — One behavior per test (prefer multiple simpler tests)
3. **Setup/teardown** — Use `beforeEach`/`afterEach` for common setup
4. **Isolated tests** — No dependencies between test cases
5. **Real data** — Use actual attack payloads, not mock/stubbed data

## CI/CD Integration

Tests automatically run on:
- **Push to main/develop** — Runs full test suite
- **Pull requests** — Must pass before merge
- **Schedule** — Weekly security audit

See `.github/workflows/test.yml` for configuration.

## Debugging Tests

### Run Single Test
```bash
npm test -- --testNamePattern="should detect UNION"
```

### Verbose Output
```bash
npm test -- --verbose
```

### Debug Mode
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

Then open `chrome://inspect` in Chrome DevTools.

## Performance

Each test should complete in < 100ms. For slower tests, use `jest.setTimeout(10000)` in that describe block.

## Troubleshooting

### Tests Timeout
- Increase timeout: `jest.setTimeout(15000)`
- Check if DB connection is slow
- Profile with `npm test -- --detectOpenHandles`

### Database Connection Errors
- Ensure PostgreSQL is running (if using DB tests)
- Check DB_HOST and credentials in `__tests__/setup.js`
- Default: in-memory mode (no DB required)

### Coverage Not Meeting Threshold
- Check coverage report: `open coverage/lcov-report/index.html`
- Add tests for uncovered lines
- Update threshold in `jest.config.js` if intentional

## Future Test Improvements

- [ ] Add E2E tests with real attack scenarios
- [ ] Performance benchmarks for detection methods
- [ ] Mutation testing to verify test quality
- [ ] Load testing with concurrent attack simulations
- [ ] Docker-based test environment automation
