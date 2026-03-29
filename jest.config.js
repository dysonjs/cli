const path = require('path');

const ROOT_DIR = __dirname;

module.exports = {
  testTimeout: 30000,
  setupFiles: [path.resolve(ROOT_DIR, 'jest.setup.js')],
  setupFilesAfterEnv: ['jest-sinon'],
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    runScripts: 'dangerously',
    resources: 'usable',
  },
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],
  modulePathIgnorePatterns: ['<rootDir>/.*/__mocks__', '<rootDir>/dist'],
  collectCoverageFrom: ['<rootDir>/src/**/*.[jt]s?(x)', '!<rootDir>/src/**/*.d.ts'],
  coverageThreshold: {
    global: {
      lines: 90,
      statements: 90,
    },
  },
  coverageReporters: ['lcov', 'text', 'json-summary'],
  coverageDirectory: 'coverage',
  testMatch: ['<rootDir>/test/**/*.test.[jt]s?(x)'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  globals: {
    'ts-jest': {
      tsconfig: path.resolve(ROOT_DIR, 'tsconfig.json'),
    },
  },
};
