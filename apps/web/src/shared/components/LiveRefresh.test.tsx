import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))

const { LiveRefresh } = await import('./LiveRefresh')

function visibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
}

describe('OF-US4-S2 LiveRefresh keeps a list live', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    refresh.mockClear()
    visibility('visible')
  })
  afterEach(() => vi.useRealTimers())

  it('reloads the page only when the stamp changes', async () => {
    const stamps = ['a', 'a', 'b', 'b']
    const check = vi.fn(async () => stamps.shift() ?? 'b')
    render(<LiveRefresh stamp="a" check={check} />)
    for (let i = 0; i < 4; i++) await act(() => vi.advanceTimersByTimeAsync(3000))
    expect(check).toHaveBeenCalledTimes(4)
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('does not check while the tab is hidden', async () => {
    visibility('hidden')
    const check = vi.fn(async () => 'b')
    render(<LiveRefresh stamp="a" check={check} />)
    await act(() => vi.advanceTimersByTimeAsync(9000))
    expect(check).not.toHaveBeenCalled()
    expect(refresh).not.toHaveBeenCalled()
  })

  it('a failed check is retried on the next tick', async () => {
    const check = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue('b')
    render(<LiveRefresh stamp="a" check={check} />)
    await act(() => vi.advanceTimersByTimeAsync(6000))
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('stops after a long quiet spell and when unmounted', async () => {
    const check = vi.fn(async () => 'a')
    const { unmount } = render(<LiveRefresh stamp="a" check={check} every={1000} quietMs={3000} />)
    await act(() => vi.advanceTimersByTimeAsync(10_000))
    expect(check.mock.calls.length).toBeLessThanOrEqual(3)
    unmount()
  })
})
