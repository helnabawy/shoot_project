import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.PORT ?? 3000)
const baseURL = process.env.BASE_URL ?? `http://localhost:${PORT}`

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0, // flaky tests get fixed, not retried
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL, trace: 'retain-on-failure' },
  webServer: process.env.BASE_URL
    ? undefined
    : {
        // Requires `pnpm --filter web build` first; e2e runs against a production build.
        command: 'pnpm payload migrate && pnpm seed && pnpm start',
        // The creator specs need the demo creators (D2222…D8888); the seed refuses them on a non-local host.
        env: { SEED_DEMO_CREATORS: '1', E2E_CLOCK: '1' },
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 240_000,
      },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'nojs', use: { ...devices['Pixel 7'], javaScriptEnabled: false } },
    {
      name: 'ar-mobile',
      use: { ...devices['Pixel 7'], locale: 'ar', extraHTTPHeaders: { 'Accept-Language': 'ar' } },
    },
    { name: 'dark', use: { ...devices['Desktop Chrome'], colorScheme: 'dark' } },
  ],
})
