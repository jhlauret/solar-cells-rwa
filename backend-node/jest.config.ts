import type { Config } from 'jest';

const config: Config = {
  preset:         'ts-jest',
  testEnvironment:'node',
  roots:          ['<rootDir>/tests'],
  testMatch:      ['**/*.test.ts'],
  transform:      { '^.+\\.ts$': ['ts-jest', { tsconfig: { rootDir: '.', outDir: './dist' } }] },
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  setupFiles:     ['<rootDir>/tests/setup.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/server.ts'],
  coverageDirectory: 'coverage',
};

export default config;
