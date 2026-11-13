// The inbox module's public surface (feature 019). Collection configs are imported by payload.config.ts directly.
export { briefsSummary, creatorInbox, inboxContext, rejectReasons, type InboxContext } from './queries'
export { getCreatorBriefsV1 } from './api'
