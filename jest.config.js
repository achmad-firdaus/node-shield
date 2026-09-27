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
      branches: 15,
      functions: 15,
      lines: 15,
      statements: 15,
    },
  },
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    'test\\.js$',
    'test-enhanced-scanning\\.js$',
    'test-docker-15min\\.sh$',
  ],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
};
