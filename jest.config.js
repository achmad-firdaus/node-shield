module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'shield.js',
    'logger.js',
    'app-standalone.js',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**',
    '!**/migrations/**',
  ],
  coverageThreshold: {
    global: {
      branches: 20,
      functions: 20,
      lines: 20,
      statements: 20,
    },
  },
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js',
    '!test.js',
    '!test-*.js',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    'test.js',
    'test-enhanced-scanning.js',
  ],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
};
