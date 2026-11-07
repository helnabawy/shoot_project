import { describe, expect, it } from 'vitest'
import { safeNext } from './safe-next'

describe('FR-025 return-to destination', () => {
  it.each([
    ['/account', '/account'],
    ['/ar/account', '/account'],
    ['/ar', '/'],
    ['/register?x=1', '/register?x=1'],
  ])('keeps %s', (input, expected) => expect(safeNext(input)).toBe(expected))

  it.each(['https://evil.example', '//evil.example', '/\\evil', '', null, 42])('rejects %s', (input) => {
    expect(safeNext(input)).toBe('/account')
  })
})
