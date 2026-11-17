/**
 * 022 (T082, constitution VII): a per-instance throttle for cheap polled reads (the offer stamps). The
 * database allowance is too heavy for a read made every few seconds, so this keeps the time of the last
 * answered read per key in memory: at most one answered read per `everyMs` per key. Bounded; the oldest
 * keys are dropped first.
 */
const seen = new Map<string, number>()
const MAX_KEYS = 20_000

/** `null` when a read is allowed now; otherwise the seconds until it is. */
export function throttleWait(key: string, everyMs: number, now = Date.now()): number | null {
  const last = seen.get(key)
  return last !== undefined && now - last < everyMs ? Math.max(1, Math.ceil((last + everyMs - now) / 1000)) : null
}

/** Records an answered read (only answers count, so a refused or unknown read starts no wait). */
export function throttleMark(key: string, now = Date.now()) {
  seen.delete(key)
  seen.set(key, now)
  if (seen.size > MAX_KEYS) {
    const oldest = seen.keys().next().value
    if (oldest !== undefined) seen.delete(oldest)
  }
}

/** For tests: forget every key. */
export function resetThrottle() {
  seen.clear()
}
