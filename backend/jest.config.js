/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        module: 'commonjs',
      }
    }]
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  collectCoverageFrom: ['src/**/*.ts'],
  // setup.ts populates process.env BEFORE any module is required
  setupFiles: ['<rootDir>/tests/setup.ts'],
  setupFilesAfterEnv: [],
  // Force exit after tests complete (prevents hanging on open DB connections etc.)
  forceExit: true,
  // Don't reset module registry between test files — app module stays cached
  // This prevents multiple app.listen() calls across test files
  resetModules: false,
};
