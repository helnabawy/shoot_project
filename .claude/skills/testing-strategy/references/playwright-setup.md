# Playwright setup

```ts
// apps/web/playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 0,                                   // flaky tests get fixed, not retried
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: process.env.BASE_URL ?? 'http://localhost:3000', trace: 'retain-on-failure' },
  webServer: {
    command: 'pnpm payload migrate && pnpm seed && pnpm start',          // production build is made in CI before this
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'nojs', use: { ...devices['Pixel 7'], javaScriptEnabled: false } },
    { name: 'ar-mobile', use: { ...devices['Pixel 7'], locale: 'ar', extraHTTPHeaders: { 'Accept-Language': 'ar' } } },
    { name: 'dark', use: { ...devices['Desktop Chrome'], colorScheme: 'dark' } },
  ],
})
```

- E2E runs against a **production build** (`next build`), because
  development mode hides performance and caching behaviour.
- The database for e2e is a disposable PostgreSQL (Docker service in CI,
  `docker compose up postgres` locally). `payload migrate` then `pnpm seed`
  make it deterministic.
- Tag smoke tests with `@smoke` in the title; CI on PRs runs
  `playwright test --grep @smoke`.
- Accessibility: in each public-page spec, run
  `new AxeBuilder({ page }).analyze()` and assert no `serious`/`critical`
  violations.
- Auth fixture: a `member` fixture registers a fresh user through the UI
  once per worker and stores `storageState`; specs needing a session reuse it.
- Mobile project exists so the floating WhatsApp button, mobile menu and
  form layouts are exercised at phone width.
- `ar-mobile` proves RTL: `expect(page.locator('html')).toHaveAttribute('dir', 'rtl')`,
  `scrollWidth === clientWidth`, Arabic hero text, and that `/` with
  `Accept-Language: ar` redirects to `/ar` for a first visit.
- `dark` proves the theme: `page.emulateMedia({ colorScheme: 'dark' })` is
  already set; assert `document.documentElement.classList.contains('dark')`
  on load and that `getComputedStyle(body).backgroundColor` equals the dark
  token before any client script (use `page.addInitScript` to record the
  first computed value).

Example smoke spec:

```ts
test('@smoke US2-S1 WhatsApp link uses the configured number', async ({ page }) => {
  await page.goto('/')
  const cta = page.getByRole('link', { name: /whatsapp/i }).first()
  await expect(cta).toHaveAttribute('href', /https:\/\/wa\.me\/971500000000\?text=/   // the seeded placeholder number)
})
```
