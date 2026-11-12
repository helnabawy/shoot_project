import { expect, test } from '@playwright/test'

test.describe('US2 WhatsApp', () => {
  test('@smoke US2-S1 every WhatsApp action uses the configured number and message', async ({ page }, info) => {
    test.skip(info.project.name === 'ar-mobile' || info.project.name === 'dark')
    await page.goto('/')
    const settings = await (await page.request.get('/api/globals/site-settings')).json()
    const digits = String(settings.whatsappNumber).replace('+', '')
    const links = page.locator('a[href^="https://wa.me/"]')
    expect(await links.count()).toBeGreaterThan(0)
    for (const href of await links.evaluateAll((els) => els.map((e) => e.getAttribute('href')))) {
      expect(href).toMatch(new RegExp(`^https://wa\\.me/${digits}(\\?text=.+)?$`))
    }
    await expect(page.getByTestId('whatsapp-secondary')).toHaveAttribute('href', new RegExp(encodeURIComponent(settings.whatsappDefaultMessage).replace(/[!'()*]/g, '.')))
  })

  test('US2-S2 the floating button is visible on phones and never covers the register submit', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile')
    await page.goto('/')
    // While the brief panel is on screen it already offers WhatsApp, so the button steps aside.
    await expect(page.getByTestId('whatsapp-floating')).toHaveAttribute('data-covered', 'true')
    await page.mouse.wheel(0, 2000)
    await expect(page.getByTestId('whatsapp-floating')).not.toHaveAttribute('data-covered')
    await expect(page.getByTestId('whatsapp-floating')).toBeVisible()
    await page.goto('/register')
    const button = await page.getByTestId('whatsapp-floating').boundingBox()
    const submit = await page.getByTestId('send-code').boundingBox()
    const overlap = button && submit && !(button.x > submit.x + submit.width || button.x + button.width < submit.x || button.y > submit.y + submit.height || button.y + button.height < submit.y)
    expect(overlap).toBeFalsy()
  })

  test('without JavaScript the WhatsApp links still work', async ({ page }, info) => {
    test.skip(info.project.name !== 'nojs')
    await page.goto('/')
    await expect(page.locator('a[href^="https://wa.me/"]').first()).toHaveAttribute('target', '_blank')
  })
})
