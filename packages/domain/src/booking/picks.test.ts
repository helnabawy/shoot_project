import { describe, expect, it } from 'vitest'
import { formatPicks, parsePicks, withPick } from './picks'

describe('step 2 → step 3 picks', () => {
  it('parses creators and "any"', () => {
    expect(parsePicks('photographer:d2222,videographer:any')).toEqual([
      { persona: 'photographer', code: 'D2222' },
      { persona: 'videographer', code: null },
    ])
  })

  it.each([
    [null],
    [''],
    ['photographer'],
    ['photographer:D2222,photographer:D3333'],
    ['Photographer:D2222'],
    ['a:any,b:any,c:any,d:any,e:any'],
    ['photographer:D0000'],
    [' , '],
  ])('rejects %j', (input) => {
    expect(parsePicks(input)).toBeNull()
  })

  it('round-trips and replaces one pick', () => {
    const picks = parsePicks('photographer:D2222,videographer:any') ?? []
    expect(parsePicks(formatPicks(picks))).toEqual(picks)
    expect(withPick(picks, { persona: 'videographer', code: 'D3333' })).toEqual([
      { persona: 'photographer', code: 'D2222' },
      { persona: 'videographer', code: 'D3333' },
    ])
    expect(withPick([], { persona: 'p', code: null })).toEqual([{ persona: 'p', code: null }])
  })
})
