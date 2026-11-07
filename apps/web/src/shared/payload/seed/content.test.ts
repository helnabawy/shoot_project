import { describe, expect, it } from 'vitest'
import { landingPage } from './content'

describe('CP-US1-S1 default landing content', () => {
  it('opens the sections under the hero with "Our network"', () => {
    expect(landingPage.sections[0]?.blockType).toBe('creatorNetwork')
  })
})
