module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/src/__tests__/setup.js'],
  testMatch: ['**/__tests__/**/*.test.js'],
  modulePathIgnorePatterns: ['<rootDir>/node_modules/'],
  testTimeout: 30000,
  maxWorkers: 1,
  verbose: true,
};
