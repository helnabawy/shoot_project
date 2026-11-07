import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/index.ts', 'src/**/types.ts'],
      thresholds: { statements: 100, branches: 95, functions: 100, lines: 100 },
    },
  },
})
