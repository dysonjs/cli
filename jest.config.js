module.exports = {
  testTimeout: 30000,
  setupFilesAfterEnv: ['jest-sinon'],
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    runScripts: 'dangerously',
    resources: 'usable',
  },
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],
  modulePathIgnorePatterns: ['<rootDir>/.*/__mocks__'],
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
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json',
    },
  },
};
