// Public surface of the legal module (config-time code imports ./paths and ./hooks directly).
export { currentVersions, getLegalDocument, getLegalForRegistration, getLegalLinks, getLegalVersion, getLegalVersions } from './queries'
export type { LegalLink, LegalVersionView, LegalView } from './queries'
export { acceptedKinds, recordAcceptances } from './record'
export { legalPath } from './paths'
// The mobile API (008).
export { getLegalV1, getLegalVersionV1, getLegalVersionsV1 } from './api'
export { toWireLegalDocument, toWireLegalVersion, toWireLegalVersions } from './wire'
