import { revalidatePath, revalidateTag } from 'next/cache'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { revalidateLandingPage, revalidateTagAfterChange, revalidateTagAfterDelete, safeRevalidate } from './revalidate'

vi.mock('next/cache', () => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }))

const args = (disableRevalidate?: boolean) => ({ doc: { id: 1 }, req: { context: { disableRevalidate } } })

describe('FR-014 revalidation hooks', () => {
  beforeEach(() => vi.clearAllMocks())

  it('revalidates the tag with the "max" profile and returns the doc', () => {
    expect(revalidateTagAfterChange('personas')(args())).toEqual({ id: 1 })
    expect(revalidateTag).toHaveBeenCalledWith('personas', 'max')
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('revalidates the landing page paths too', () => {
    revalidateLandingPage(args())
    expect(revalidateTag).toHaveBeenCalledWith('landing-page', 'max')
    expect(revalidatePath).toHaveBeenCalledWith('/[locale]')
  })

  it('does nothing when context.disableRevalidate is set (seeds, tests)', () => {
    revalidateTagAfterChange('personas')(args(true))
    revalidateTagAfterDelete('personas')(args(true))
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it('afterDelete revalidates the tag', () => {
    revalidateTagAfterDelete('categories')(args())
    expect(revalidateTag).toHaveBeenCalledWith('categories', 'max')
  })

  it('swallows errors outside a Next.js request and warns in development', () => {
    vi.mocked(revalidateTag).mockImplementationOnce(() => {
      throw new Error('no request store')
    })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubEnv('NODE_ENV', 'development')
    expect(() => safeRevalidate('x')).not.toThrow()
    expect(warn).toHaveBeenCalled()
    vi.unstubAllEnvs()
    vi.mocked(revalidateTag).mockImplementationOnce(() => {
      throw new Error('again')
    })
    expect(() => safeRevalidate('x')).not.toThrow()
    warn.mockRestore()
  })
})
