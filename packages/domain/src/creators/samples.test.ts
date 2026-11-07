import { describe, expect, it } from 'vitest'
import { canAddSample, isAllowedVideoUrl } from './samples'

describe('CP-US3-S1 video samples', () => {
  it.each([
    'https://www.youtube.com/watch?v=abc123',
    'https://youtube.com/shorts/abc123',
    'https://youtu.be/abc123',
    'https://vimeo.com/123456',
    'https://player.vimeo.com/video/123456',
  ])('accepts %s', (url) => {
    expect(isAllowedVideoUrl(url)).toBe(true)
  })

  it.each([
    'http://youtube.com/watch?v=abc',
    'https://evil.com/watch?v=abc',
    'https://youtube.com.evil.com/x',
    'https://notyoutube.com/x',
    'javascript:alert(1)',
    'youtube.com/watch?v=abc',
    '',
  ])('rejects %j', (url) => {
    expect(isAllowedVideoUrl(url)).toBe(false)
  })

  it('allows a sample while under the cap and refuses the 31st', () => {
    expect(canAddSample(0)).toBe(true)
    expect(canAddSample(29)).toBe(true)
    expect(canAddSample(30)).toBe(false)
    expect(canAddSample(31)).toBe(false)
  })
})
