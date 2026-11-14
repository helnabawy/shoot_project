import 'server-only'
import { androidAssetLinks, appleAssociation } from '@shoot/domain/api/v1'
import { env } from '@/shared/lib/env'

/**
 * The two app-link association files (research R13): served at the site root as JSON, cached for an
 * hour, never redirected or localised. Unset configuration answers 404, so no app claims the links.
 */

const HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' }

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: HEADERS })
const missing = () => new Response(null, { status: 404, headers: { 'Cache-Control': 'public, max-age=3600' } })

/** `GET /.well-known/apple-app-site-association` from `APP_IOS_APP_IDS`. */
export function appleAssociationFile(): Response {
  const ids = env().APP_IOS_APP_IDS
  return ids && ids.length > 0 ? json(appleAssociation(ids)) : missing()
}

/** `GET /.well-known/assetlinks.json` from `APP_ANDROID_PACKAGE` and `APP_ANDROID_CERT_SHA256`. */
export function assetLinksFile(): Response {
  const { APP_ANDROID_PACKAGE: pkg, APP_ANDROID_CERT_SHA256: certs } = env()
  return pkg && certs && certs.length > 0 ? json(androidAssetLinks(pkg, certs)) : missing()
}
