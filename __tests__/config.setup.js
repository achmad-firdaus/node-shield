// Set test environment variables
process.env.NODE_ENV = 'test';

// Force in-memory mode for unit tests (no DB_HOST set)
// This allows tests to run without PostgreSQL
delete process.env.DB_HOST;
delete process.env.DB_PORT;
delete process.env.DB_NAME;
delete process.env.DB_USER;
delete process.env.DB_PASSWORD;

// Increase timeout for tests
jest.setTimeout(10000);
