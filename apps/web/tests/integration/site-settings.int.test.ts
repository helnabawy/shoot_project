import { revalidateTag } from 'next/cache'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { getSiteSettings } from '@/modules/site-settings/queries'
import { seed } from '@/shared/payload/seed/seed'
import { createUser, getTestPayload, resetDatabase } from './setup/payload'

describe('US2 site settings', () => {
  beforeAll(async () => {
    await resetDatabase()
    await seed(await getTestPayload(), { log: () => {} })
  })

  it('US2-S3 a number change is stored normalised and revalidates the cache', async () => {
    const payload = await getTestPayload()
    vi.mocked(revalidateTag).mockClear()
    await payload.updateGlobal({ slug: 'site-settings', data: { whatsappNumber: '+971 58 149 8824' } })
    expect(revalidateTag).toHaveBeenCalledWith('site-settings', 'max')
    expect((await getSiteSettings('en')).whatsappNumber).toBe('+971581498824')
  })

  it('anyone can read the contact number; members cannot change it', async () => {
    const payload = await getTestPayload()
    const anonymous = await payload.findGlobal({ slug: 'site-settings', overrideAccess: false })
    expect(anonymous.whatsappNumber).toBe('+971581498824')
    const member = await createUser(['member'])
    await expect(
      payload.updateGlobal({ slug: 'site-settings', data: { whatsappNumber: '+971500000001' }, overrideAccess: false, user: member }),
    ).rejects.toThrow()
  })

  it('keeps the Arabic message separate from the English one', async () => {
    expect((await getSiteSettings('ar')).whatsappDefaultMessage).toBe('مرحباً! أرغب في حجز جلسة تصوير.')
    expect((await getSiteSettings('en')).whatsappDefaultMessage).toBe("Hi! I'd like to book a shoot.")
  })
})
