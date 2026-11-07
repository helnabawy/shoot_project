import AxeBuilder from '@axe-core/playwright'
import { expect, type APIRequestContext, type Page } from '@playwright/test'
import 'dotenv/config'

export const ADMIN = { email: process.env.SEED_ADMIN_EMAIL ?? '', password: process.env.SEED_ADMIN_PASSWORD ?? '' }

/** Serious or critical axe violations on the current page (WCAG 2.1 AA). */
export async function expectNoSeriousA11yIssues(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([])
}

export async function adminToken(request: APIRequestContext): Promise<string> {
  const res = await request.post('/api/users/login', { data: ADMIN })
  expect(res.ok(), 'admin login (SEED_ADMIN_* in apps/web/.env)').toBeTruthy()
  return (await res.json()).token as string
}

export const auth = (token: string) => ({ Authorization: `JWT ${token}` })

export const uniqueEmail = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@e2e.test`

/** Forces English for a context that may carry a remembered Arabic cookie. */
export async function useEnglish(page: Page) {
  await page.context().addCookies([{ name: 'NEXT_LOCALE', value: 'en', url: page.url().startsWith('http') ? page.url() : (process.env.BASE_URL ?? 'http://localhost:3000') }])
}

/** Specs of feature 005: pin the language the assertions are written in, and run only where the project fits. */
export async function inEnglish(page: Page, info: { project: { name: string } }, skip: (condition: boolean, reason: string) => void) {
  skip(info.project.name === 'ar-mobile', 'English wording; the Arabic tests of this spec cover ar-mobile')
  await page.context().addCookies([{ name: 'NEXT_LOCALE', value: 'en', url: process.env.BASE_URL ?? 'http://localhost:3000' }])
}

/** Axe needs JavaScript; the no-JS project checks behaviour instead. */
export async function a11y(page: Page, info: { project: { name: string } }) {
  if (info.project.name !== 'nojs') await expectNoSeriousA11yIssues(page)
}

/** Turns Quick Match (feature 003) on or off for specs that test the WhatsApp-only flow of 001/002. */
export async function setQuickMatch(request: APIRequestContext, enabled: boolean) {
  const token = await adminToken(request)
  const res = await request.post('/api/globals/site-settings', { headers: auth(token), data: { quickMatch: { enabled } } })
  expect(res.ok(), await res.text()).toBeTruthy()
  // The landing page is cached and revalidated stale-while-revalidate: wait until it serves the new switch.
  for (const path of ['/', '/ar']) {
    await expect
      .poll(async () => /quickMatch\\?":(true|false)/.exec(await (await request.get(path)).text())?.[1], { timeout: 30_000, intervals: [500, 1000, 2000] })
      .toBe(String(enabled))
  }
}

/** Answers the brief step by step with defaults (first option, skip optional steps). */
export async function finishBriefSteps(page: Page) {
  for (let i = 0; i < 12; i += 1) {
    if (await page.getByTestId('brief-submit').isVisible()) return
    const step = page.locator('[data-current="true"]')
    const next = step.locator('[data-testid^="brief-continue-"]')
    if (await next.isVisible()) {
      await next.click()
      continue
    }
    const skip = step.locator('[data-testid^="brief-skip-"]')
    if (await skip.isVisible()) {
      await skip.click()
      continue
    }
    await step.locator('label[data-testid^="brief-option-"]').first().click()
  }
  await expect(page.getByTestId('brief-submit')).toBeVisible()
}

/** From the landing page to step 2 with a photographer brief (any date, defaults elsewhere). */
export async function briefToStep2(page: Page, path = '/', options: { nojs?: boolean } = {}) {
  await page.goto(path)
  if (options.nojs) {
    // Without JavaScript every list shows at once: take the first row of each (the professional list starts with photographer).
    for (const list of await page.locator('[data-group]').all()) {
      const first = list.locator('input[data-row]').first()
      if (await first.count()) await first.check({ force: true })
    }
    await page.getByTestId('brief-submit').click()
    await expect(page).toHaveURL(/\/match\/B-[0-9A-Z]{5}\//, { timeout: 20_000 })
    return
  }
  await page.getByTestId('brief-option-persona-photographer').click()
  const next = page.getByTestId('brief-continue-persona')
  if (await next.isVisible()) await next.click()
  await finishBriefSteps(page)
  await page.getByTestId('brief-submit').click()
  await expect(page).toHaveURL(/\/match\/B-[0-9A-Z]{5}\//, { timeout: 20_000 })
}

/** A date ten days ahead (the UAE calendar is close enough for a form field). */
export const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)
export const inTenDays = () => inDays(10)
