import { randomBytes } from 'node:crypto'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import sharp from 'sharp'
import { adminToken, auth, expectNoSeriousA11yIssues, uniqueEmail } from './helpers'

const PASSWORD = 'e2e-password-123'
type Ids = { persona: number; category: number; city: number }

/** Ids the seed defines, read from the public REST API (never hard-coded). */
async function seedIds(request: APIRequestContext): Promise<Ids> {
  const one = async (path: string) => ((await (await request.get(path)).json()).docs[0] as { id: number }).id
  return {
    persona: await one('/api/personas?where[slug][equals]=photographer&depth=0'),
    category: await one('/api/categories?where[slug][equals]=portrait&depth=0'),
    city: await one('/api/locations?where[slug][equals]=dubai&depth=0'),
  }
}

/** A provider account signed in in this browser context (cookie set through the REST login). */
async function signedInProvider(page: Page, request: APIRequestContext, ids: Ids) {
  const email = uniqueEmail('provider')
  const created = await request.post('/api/users', { data: { name: 'E2E Provider', email, password: PASSWORD, accountType: 'provider', persona: ids.persona } })
  expect(created.ok()).toBeTruthy()
  const login = await page.context().request.post('/api/users/login', { data: { email, password: PASSWORD } })
  expect(login.ok()).toBeTruthy()
  return { email, id: (await created.json()).doc.id as number }
}

/** An admin creates and publishes the provider's profile, so the page starts in the "live" state. */
async function livePublishedProfile(request: APIRequestContext, ids: Ids, userId: number, name = 'E2E Live Pro') {
  const token = await adminToken(request)
  const created = await request.post('/api/creator-profiles?draft=false', {
    headers: auth(token),
    data: { user: userId, displayName: name, bio: 'Approved bio', personas: [ids.persona], specialties: [ids.category], cities: [ids.city], languages: ['en'], _status: 'published' },
  })
  expect(created.ok(), await created.text()).toBeTruthy()
  const doc = (await created.json()).doc as { id: number; code: string }
  return { ...doc, token }
}

const png = () => sharp({ create: { width: 64, height: 80, channels: 3, background: '#778899' } }).png().toBuffer()
/** A ~4 MB JPEG: over a server action's default 1 MB limit, under the 5 MB upload limit. */
const bigJpeg = () => sharp(randomBytes(2200 * 2200 * 3), { raw: { width: 2200, height: 2200, channels: 3 } }).jpeg({ quality: 92 }).toBuffer()

const status = (page: Page) => page.getByTestId('profile-status')
const feedback = (page: Page) => page.getByTestId('profile-feedback')

test.describe('CP-US3 providers manage their own profile', () => {
  test('@smoke CP-US3-S1…S3 a provider fills the profile, sends it, an admin publishes it, and later edits wait for approval', async ({ page, request }, info) => {
    test.skip(info.project.name !== 'desktop' && info.project.name !== 'mobile', 'the JavaScript flow in English')
    test.setTimeout(240_000)
    const started = Date.now()
    const ids = await seedIds(request)

    // A new professional starts on their profile.
    await page.goto('/register?type=provider')
    const email = uniqueEmail('journey')
    await page.getByLabel('Full name').fill('Journey Provider')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill(PASSWORD)
    await page.getByLabel('I am a').selectOption('photographer')
    await page.getByTestId('accept-terms').getByRole('checkbox').check()
    await page.getByTestId('register-submit').click()
    await expect(page).toHaveURL(/\/account\/profile$/, { timeout: 30_000 })
    await expect(status(page)).toHaveAttribute('data-status', 'draft')
    // The registration choices are already ticked.
    await expect(page.getByTestId('field-personas').locator('input:checked')).toHaveCount(1)

    // Fill the rest in English and Arabic.
    await page.getByLabel('English', { exact: true }).first().fill('Journey Pro')
    await page.locator('#displayName-ar').fill('محترف الرحلة')
    await page.locator('#bio-en').fill('Weddings and portraits.')
    await page.locator('#bio-ar').fill('أعراس وبورتريه.')
    await page.getByTestId(`specialty-${ids.category}`).click()
    await page.getByTestId(`city-${ids.city}`).click()
    await page.getByTestId('language-en').click()
    await page.getByTestId('gender-woman').click()
    await page.getByTestId('profile-save').click()
    await expect(feedback(page)).toContainText('Saved.', { timeout: 30_000 })
    await expect(status(page)).toHaveAttribute('data-status', 'draft')
    // Nobody else can see it yet.
    const codeText = await page.getByText(/^CR-/).first().textContent()
    const code = codeText!.replace('CR-', '').toLowerCase()
    expect((await request.get(`/creators/${code}`)).status()).toBe(404)

    // A sample, then send for review: the one primary action is now "Save and send for review".
    await page.setInputFiles('#sample-image', { name: 'work.png', mimeType: 'image/png', buffer: await png() })
    await page.locator('#add-caption-en').fill('Golden hour')
    await page.getByTestId('sample-add-submit').click()
    await expect(page.getByTestId('sample-count')).toContainText('1 of 30', { timeout: 30_000 })
    // CP-FR-013: the Emirates ID and trade license, each uploaded on its own.
    await expect(page.getByTestId('profile-incomplete')).toContainText("Your profile isn't complete yet.")
    for (const kind of ['emirates-id', 'trade-license']) {
      await page.setInputFiles(`#identity-${kind}`, { name: `${kind}.png`, mimeType: 'image/png', buffer: await png() })
      await page.getByTestId(`identity-${kind}-upload`).click()
      await expect(page.getByTestId(`identity-${kind}-status`)).toContainText('Waiting for our check', { timeout: 30_000 })
    }
    await expect(page.getByTestId('profile-ready')).toBeVisible()
    // A caption edited on the row is saved by the one closing action, with everything else.
    await page.locator('#caption-0-en').fill('Golden hour, Marina')
    await expect(page.getByTestId('profile-save')).toContainText('Save and send for review')
    await page.getByTestId('profile-save').click()
    await expect(feedback(page)).toContainText('sent for review', { timeout: 30_000 })
    await page.reload()
    await expect(page.locator('#caption-0-en')).toHaveValue('Golden hour, Marina')
    await expect(status(page)).toHaveAttribute('data-status', 'in-review')
    // SC-003: a provider completes a profile in under 10 minutes.
    expect(Date.now() - started).toBeLessThan(10 * 60 * 1000)

    // The admin verifies it by publishing it in the content area; it is public within 60 seconds.
    const token = await adminToken(request)
    const found = await (await request.get(`/api/creator-profiles?where[code][equals]=${code.toUpperCase()}&depth=0&draft=true`, { headers: auth(token) })).json()
    const id = found.docs[0].id as number
    const publishedAt = Date.now()
    const publish = await request.patch(`/api/creator-profiles/${id}?draft=false`, { headers: auth(token), data: { _status: 'published' } })
    expect(publish.ok(), await publish.text()).toBeTruthy()
    await expect.poll(async () => (await request.get(`/creators/${code}`)).status(), { timeout: 60_000 }).toBe(200)
    expect(Date.now() - publishedAt).toBeLessThan(60_000)
    await page.goto('/creators/' + code)
    await expect(page.getByTestId('profile-bio')).toContainText('Weddings and portraits.')

    // A later edit stays a draft: the public page keeps the approved text.
    await page.goto('/account/profile')
    await expect(status(page)).toHaveAttribute('data-status', 'live')
    await page.locator('#bio-en').fill('Edited bio, waiting for approval.')
    await page.getByTestId('profile-save').click()
    await expect(status(page)).toHaveAttribute('data-status', 'live-with-changes', { timeout: 30_000 })
    await page.goto('/creators/' + code)
    await expect(page.getByTestId('profile-bio')).toContainText('Weddings and portraits.')
    await expect(page.getByTestId('profile-bio')).not.toContainText('Edited bio')

    // With the owner's switch on, the same edit goes live at once.
    const settings = (request: APIRequestContext, on: boolean) => request.post('/api/globals/site-settings', { headers: auth(token), data: { autoPublishEdits: on } })
    expect((await settings(request, true)).ok()).toBeTruthy()
    try {
      await page.goto('/account/profile')
      await page.locator('#bio-en').fill('Live at once.')
      await expect(page.getByTestId('profile-save')).toContainText('Save and publish')
      await page.getByTestId('profile-save').click()
      await expect(feedback(page)).toContainText('Saved and live.', { timeout: 30_000 })
      await expect.poll(async () => (await (await request.get(`/creators/${code}`)).text()).includes('Live at once.'), { timeout: 60_000 }).toBe(true)
    } finally {
      expect((await settings(request, false)).ok()).toBeTruthy()
    }
  })

  test('CP-US3-S1 a photo over 1 MB uploads through the form (the server action body limit), with or without JavaScript', async ({ page, request }, info) => {
    test.skip(info.project.name === 'ar-mobile', 'asserts English text; the Arabic page is covered by the layout test')
    test.setTimeout(120_000)
    const ids = await seedIds(request)
    const { id } = await signedInProvider(page, request, ids)
    await livePublishedProfile(request, ids, id, 'Big Photo Pro')
    await page.goto('/account/profile')
    const jpeg = await bigJpeg()
    expect(jpeg.length).toBeGreaterThan(2 * 1024 * 1024)
    expect(jpeg.length).toBeLessThan(5 * 1024 * 1024)
    await page.setInputFiles('#sample-image', { name: 'big.jpg', mimeType: 'image/jpeg', buffer: jpeg })
    await page.getByTestId('sample-add-submit').click()
    await expect(page.getByTestId('sample-count')).toContainText('1 of 30', { timeout: 60_000 })
  })

  test('CP-FR-008 a file over 5 MB, and the wrong type, are refused with one plain sentence', async ({ page, request }, info) => {
    test.skip(info.project.name === 'nojs' || info.project.name === 'ar-mobile', 'English refusal text, checked with JavaScript; the no-JS upload is covered above')
    test.setTimeout(120_000)
    const ids = await seedIds(request)
    const { id } = await signedInProvider(page, request, ids)
    await livePublishedProfile(request, ids, id, 'Refusal Pro')
    await page.goto('/account/profile')
    await page.setInputFiles('#sample-image', { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image') })
    await page.getByTestId('sample-add-submit').click()
    await expect(page.getByText('Use a JPEG, PNG or WebP image.')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('sample-count')).toContainText('0 of 30')
  })

  test('CP-US3-S1 the form works without JavaScript: save, then pause and show again', async ({ page, request }, info) => {
    test.skip(info.project.name !== 'nojs')
    const ids = await seedIds(request)
    const { id } = await signedInProvider(page, request, ids)
    const live = await livePublishedProfile(request, ids, id, 'No JS Pro')
    await page.goto('/account/profile')
    await expect(status(page)).toHaveAttribute('data-status', 'live')
    await page.locator('#bio-en').fill('Saved without JavaScript.')
    await page.getByTestId('profile-save').click()
    await expect(status(page)).toHaveAttribute('data-status', 'live-with-changes', { timeout: 30_000 })
    await page.getByTestId('profile-pause').click()
    await page.getByTestId('profile-pause-confirm').click()
    await expect(status(page)).toHaveAttribute('data-status', 'paused', { timeout: 30_000 })
    expect((await request.get(`/creators/${live.code.toLowerCase()}`)).status()).toBe(404)
    await page.getByTestId('profile-pause').click()
    await expect(status(page)).toHaveAttribute('data-status', 'live-with-changes', { timeout: 30_000 })
  })

  test('CP-US3-S2 hiding the profile takes it off the public site at once; showing it brings it back, pending edits unpublished', async ({ page, request }, info) => {
    test.skip(info.project.name !== 'desktop' && info.project.name !== 'mobile')
    const ids = await seedIds(request)
    const { id } = await signedInProvider(page, request, ids)
    const live = await livePublishedProfile(request, ids, id, 'Pause Pro')
    const url = `/creators/${live.code.toLowerCase()}`
    await expect.poll(async () => (await request.get(url)).status(), { timeout: 60_000 }).toBe(200)
    await page.goto('/account/profile')
    await page.locator('#bio-en').fill('A pending edit.')
    await page.getByTestId('profile-save').click()
    await expect(status(page)).toHaveAttribute('data-status', 'live-with-changes', { timeout: 30_000 })

    await page.getByTestId('profile-pause').click()
    await expect(page.getByText('Hide your profile from the site now?')).toBeVisible()
    await page.getByTestId('profile-pause-confirm').click()
    await expect(status(page)).toHaveAttribute('data-status', 'paused', { timeout: 30_000 })
    await expect.poll(async () => (await request.get(url)).status(), { timeout: 60_000 }).toBe(404)
    await page.getByTestId('profile-pause').click()
    await expect(status(page)).toHaveAttribute('data-status', 'live-with-changes', { timeout: 30_000 })
    await expect.poll(async () => (await request.get(url)).status(), { timeout: 60_000 }).toBe(200)
    expect(await (await request.get(url)).text()).not.toContain('A pending edit.')
  })

  test('CP-US3 a seeker has no profile page, and a visitor is sent to log in', async ({ page, request }) => {
    const seekerEmail = uniqueEmail('seeker')
    await request.post('/api/users', { data: { name: 'E2E Seeker', email: seekerEmail, password: PASSWORD, accountType: 'seeker' } })
    const signedOut = await page.goto('/account/profile')
    await expect(page).toHaveURL(/\/login\?next=%2Faccount%2Fprofile|\/login\?next=\/account\/profile/)
    expect(signedOut?.status()).toBeLessThan(400)
    await page.context().request.post('/api/users/login', { data: { email: seekerEmail, password: PASSWORD } })
    const response = await page.goto('/account/profile')
    expect(response?.status()).toBe(404)
  })

  test('CP-FR-010 the profile editor follows the page language and direction, and has no serious a11y issues or overflow', async ({ page, request }, info) => {
    const ids = await seedIds(request)
    const { id } = await signedInProvider(page, request, ids)
    await livePublishedProfile(request, ids, id, 'Layout Pro')
    await page.setViewportSize({ width: 360, height: 740 })
    await page.goto('/account/profile')
    await expect(page.getByTestId('profile-save')).toBeVisible()
    if (info.project.name === 'ar-mobile') {
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('ملفي')
      // The page language's field comes first.
      expect(await page.locator('input[name^="displayName_"]').evaluateAll((els) => els.map((e) => (e as HTMLInputElement).lang))).toEqual(['ar', 'en'])
    } else {
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('My profile')
    }
    if (info.project.name === 'nojs') return
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
    await expectNoSeriousA11yIssues(page)
  })
})
