/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^@ipam/shared-validation$': '<rootDir>/../../packages/shared-validation/index.ts',
    '^@ipam/shared-audit$': '<rootDir>/../../packages/shared-audit/index.ts',
  },
};
