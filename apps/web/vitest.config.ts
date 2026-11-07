import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      // Our routes, pages and layouts count. Only the boilerplate Payload generates for its admin
      // and REST/GraphQL catch-alls is left out (parentheses and brackets escaped for the glob).
      exclude: [
        'src/app/\\(payload\\)/admin/**',
        'src/app/\\(payload\\)/layout.tsx',
        'src/app/\\(payload\\)/api/\\[...slug\\]/**',
        'src/app/\\(payload\\)/api/graphql*/**',
        'src/i18n/{routing,navigation,request}.ts',
        'src/proxy.ts',
        'src/payload-types.ts',
        'src/migrations/**',
        'src/**/*.test.*',
        'src/**/index.ts',
        'src/shared/payload/seed/**',
      ],
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.test.ts', 'tests/unit/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'component',
          environment: 'jsdom',
          include: ['src/**/*.test.tsx'],
          setupFiles: ['./tests/setup/component.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          environment: 'node',
          include: ['tests/integration/**/*.int.test.ts'],
          globalSetup: ['./tests/integration/setup/global-setup.ts'],
          setupFiles: ['./tests/integration/setup/env.ts'],
          fileParallelism: false,
          testTimeout: 60_000,
          hookTimeout: 180_000,
        },
      },
    ],
  },
})
