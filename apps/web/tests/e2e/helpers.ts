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
