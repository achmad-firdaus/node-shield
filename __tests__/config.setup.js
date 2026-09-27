// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '5432';
process.env.DB_NAME = process.env.DB_NAME || 'node_shield_test';
process.env.DB_USER = process.env.DB_USER || 'shield_user';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'shield_password';

// Increase timeout for integration tests
jest.setTimeout(10000);
