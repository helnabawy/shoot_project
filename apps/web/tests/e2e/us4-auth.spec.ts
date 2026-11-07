import { expect, test } from '@playwright/test'
import { uniqueEmail } from './helpers'

const PASSWORD = 'e2e-password-123'

test.describe('US4 accounts', () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name === 'ar-mobile' || info.project.name === 'dark')
  })

  test('@smoke register → account → logout → protected → login → back', async ({ page }) => {
    const email = uniqueEmail('seeker')
    await page.goto('/register')
    await page.getByLabel('Full name').fill('E2E Seeker')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill(PASSWORD)
    await page.getByTestId('accept-terms').getByRole('checkbox').check()
    await page.getByTestId('register-submit').click()
    await expect(page).toHaveURL(/\/account$/)
    await expect(page.getByTestId('account-summary')).toContainText(email)

    await page.getByTestId('logout').click()
    await expect(page).toHaveURL(/\/$/)
    await page.goto('/account')
    await expect(page).toHaveURL(/\/login\?next=%2Faccount$/)

    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill(PASSWORD)
    await page.getByTestId('login-submit').click()
    await expect(page).toHaveURL(/\/account$/)
  })

  test('US4-S2 a provider picks one of the active professions', async ({ page }) => {
    await page.goto('/register?type=provider')
    await page.getByLabel('Full name').fill('E2E Provider')
    await page.getByLabel('Email').fill(uniqueEmail('provider'))
    await page.getByLabel('Password').fill(PASSWORD)
    await page.getByLabel('I am a').selectOption('videographer')
    await page.getByTestId('accept-terms').getByRole('checkbox').check()
    await page.getByTestId('register-submit').click()
    // A new professional starts on their profile, and the account page links back to it.
    await expect(page).toHaveURL(/\/account\/profile$/)
    await expect(page.getByRole('heading', { level: 1, name: 'My profile' })).toBeVisible()
    await page.goto('/account')
    await expect(page.getByTestId('account-summary')).toContainText('Videographer')
    await expect(page.getByTestId('my-profile-link')).toBeVisible()
  })

  test('US4-S3 an email that already has an account gets a clear message', async ({ page }) => {
    const email = uniqueEmail('twice')
    for (let i = 0; i < 2; i += 1) {
      await page.context().clearCookies()
      await page.goto('/register')
      await page.getByLabel('Full name').fill('Twice')
      await page.getByLabel('Email').fill(email)
      await page.getByLabel('Password').fill(PASSWORD)
      await page.getByTestId('accept-terms').getByRole('checkbox').check()
    await page.getByTestId('register-submit').click()
      if (i === 0) await expect(page).toHaveURL(/\/account$/)
    }
    await expect(page.getByText('This email already has an account. Log in instead.')).toBeVisible()
  })

  test('US4-S5 five wrong passwords lock the account', async ({ page, request }) => {
    const email = uniqueEmail('locked')
    await request.post('/api/users', { data: { name: 'Locked', email, password: PASSWORD, accountType: 'seeker' } })
    await page.goto('/login')
    const attempt = async (password: string) => {
      await page.getByLabel('Email').fill(email)
      await page.getByLabel('Password').fill(password)
      await Promise.all([
        page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('/login')),
        page.getByTestId('login-submit').click(),
      ])
    }
    for (let i = 0; i < 5; i += 1) {
      await attempt('wrong-password')
      await expect(page.getByTestId('login-form').getByRole('alert')).toHaveText('Email or password is incorrect.')
    }
    await attempt(PASSWORD)
    await expect(page.getByTestId('login-form').getByRole('alert')).toHaveText('Too many attempts. Try again in 15 minutes.')
  })
})
