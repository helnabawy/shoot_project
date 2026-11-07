import type { PayloadRequest } from 'payload'
import { consumeAllowance, visitorKey } from '@/shared/payload/rate-limit'

export { RATE_WINDOW_MS, visitorKey } from '@/shared/payload/rate-limit'

/**
 * Counts an anonymous brief against the visitor's hourly allowance and refuses it past the limit
 * (FR-050). Shared by every write path because it runs in the `briefs` beforeChange hook.
 */
export function consumeBriefAllowance(req: PayloadRequest, limit: number, now = Date.now()): Promise<void> {
  return consumeAllowance(req, `brief:${visitorKey(req)}`, limit, 'brief.errors.tooMany', now)
}
