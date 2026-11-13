import 'server-only'
import type { OnAccepted } from './answer-brief'

/**
 * Tells the client and the team that a creator said yes (US4, FR-010). Filled in by US4; until then an
 * acceptance is only recorded.
 */
export const onAccepted: OnAccepted = async () => {}
