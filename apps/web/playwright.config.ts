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
