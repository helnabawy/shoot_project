import { expect, test } from '@playwright/test'
import { createAccount, e2ePhone, enterOutboxCode, uniqueEmail } from './helpers'

const PASSWORD = 'e2e-password-123'

// Feature 009 amended 001's accounts (FR-019 to FR-022): sign-in and sign-up are by number and code;
// email and password stay on /login/email for editors and email members, with the same lockout.
test.describe('US4 accounts', () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name === 'ar-mobile' || info.project.name === 'dark')
  })

  test('@smoke sign in by code → account → logout → protected → sign-in page with next', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Mobile number').fill(e2ePhone().slice(4))
    await page.getByTestId('send-code').click()
    await enterOutboxCode(page)
    await expect(page).toHaveURL(/\/account$/)
    await expect(page.getByTestId('account-summary')).toContainText('+971')

    await page.getByTestId('logout').click()
    await expect(page).toHaveURL(/\/$/)
    await page.goto('/account')
    await expect(page).toHaveURL(/\/login\?next=%2Faccount$/)
  })

  test('US4-S2 a creator picks one of the active professions when joining', async ({ page }) => {
    await page.goto('/register')
    await page.getByLabel('I am a').selectOption('videographer')
    await page.getByLabel('Mobile number').fill(e2ePhone())
    await page.getByTestId('accept-terms').getByRole('checkbox').check()
    await page.getByTestId('send-code').click()
    await enterOutboxCode(page)
    // A new professional starts on their profile, and the account page links back to it.
    await expect(page).toHaveURL(/\/account\/profile$/)
    await page.goto('/account')
    await expect(page.getByTestId('account-summary')).toContainText('Videographer')
  })

  test('US4-S5 five wrong passwords lock the account (email sign-in)', async ({ page, request }) => {
    const email = uniqueEmail('locked')
    await createAccount(request, { name: 'Locked', email, password: PASSWORD, accountType: 'seeker' })
    await page.goto('/login/email')
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
