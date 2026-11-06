# Vitest setup

One `vitest.config.ts` per package. `apps/web` uses Vitest **projects** so
unit, component and integration tests get different environments without
separate commands.

```ts
// apps/web/vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/app/(payload)/**', 'src/payload-types.ts', '**/*.test.*', 'src/**/index.ts'],
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
    },
    projects: [
      {
        extends: true,
        test: { name: 'unit', environment: 'node', include: ['src/**/*.test.ts', 'tests/unit/**/*.test.ts'] },
      },
      {
        extends: true,
        test: {
          name: 'component', environment: 'jsdom', include: ['src/**/*.test.tsx'],
          setupFiles: ['./tests/setup/component.ts'],   // @testing-library/jest-dom matchers, cleanup
        },
      },
      {
        extends: true,
        test: {
          name: 'integration', environment: 'node', include: ['tests/integration/**/*.int.test.ts'],
          globalSetup: ['./tests/integration/setup/global-setup.ts'],
          fileParallelism: false,      // one Payload instance + one PostgreSQL container; files run serially
          testTimeout: 30_000, hookTimeout: 60_000,
        },
      },
    ],
  },
})
```

```ts
// packages/domain/vitest.config.ts
import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    environment: 'node',
    coverage: { provider: 'v8', include: ['src/**/*.ts'], exclude: ['**/*.test.ts', 'src/index.ts'],
      thresholds: { statements: 100, branches: 95, functions: 100, lines: 100 } },
  },
})
```

Notes:

- `vite-tsconfig-paths` makes `@/`, `@payload-config` and `@shoot/domain`
  resolve the same way as in Next.js.
- Server Components that are `async` cannot be rendered by Testing Library
  directly; test the presentational child components with fixtures and cover
  the async page with an e2e test.
- Mock `next/navigation` (`useRouter`, `redirect`) and `next/headers` in
  component tests via `tests/setup/component.ts`.
- Root `package.json` scripts call `pnpm -r --parallel test` for unit and
  component, and run integration serially.
