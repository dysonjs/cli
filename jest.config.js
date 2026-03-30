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
  moduleNameMapper: {
    '^@dysonic/dy-cli$': path.resolve(ROOT_DIR, 'packages/cli/src'),
    '^@dysonic/dy-cli-core$': path.resolve(ROOT_DIR, 'packages/core/src'),
    '^@dysonic/dy-cli-cmd-add$': path.resolve(ROOT_DIR, 'packages/cmd-add/src'),
    '^@dysonic/dy-cli-cmd-build$': path.resolve(ROOT_DIR, 'packages/cmd-build/src'),
    '^@dysonic/dy-cli-cmd-create$': path.resolve(ROOT_DIR, 'packages/cmd-create/src'),
    '^@dysonic/dy-cli-cmd-publish$': path.resolve(ROOT_DIR, 'packages/cmd-publish/src'),
    '^@dysonic/dy-cli-cmd-test$': path.resolve(ROOT_DIR, 'packages/cmd-test/src'),
  },
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
