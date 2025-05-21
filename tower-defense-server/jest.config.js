module.exports = {
    testEnvironment: 'node',
    coveragePathIgnorePatterns: [
        '/node_modules/',
        '/tests/',
        '/dist/'
    ],
    collectCoverage: true,
    coverageReporters: ['text', 'lcov'],
    testMatch: ['**/tests/**/*.test.js']
};