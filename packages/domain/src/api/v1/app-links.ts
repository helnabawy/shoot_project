/**
 * App links (research R13, data-model.md "App links"): the website addresses the app opens, and the
 * two association files built from them. Editor pages at `/{slug}` are not listed: their addresses
 * cannot be named as prefixes, so they open in the browser.
 */

const BASE_PREFIXES = ['/', '/creators', '/book', '/work', '/hire', '/match', '/q', '/account', '/guides', '/terms', '/privacy', '/login', '/register'] as const

/** The two home pages: matched exactly, so editor pages under them are not claimed. */
export const APP_LINK_HOMES: readonly string[] = ['/', '/ar']

/** Every link prefix, each also under `/ar`; the homes `/` and `/ar` are exact paths. */
export const APP_LINK_PREFIXES: readonly string[] = [...BASE_PREFIXES, ...BASE_PREFIXES.map((p) => (p === '/' ? '/ar' : `/ar${p}`))]

export interface AppleAssociation {
  applinks: { details: { appIDs: string[]; components: { '/': string }[] }[] }
}

/** The `apple-app-site-association` document: one component per prefix and one for its subpaths. */
export function appleAssociation(appIds: readonly string[]): AppleAssociation {
  const components = APP_LINK_PREFIXES.flatMap((prefix) => (APP_LINK_HOMES.includes(prefix) ? [{ '/': prefix }] : [{ '/': prefix }, { '/': `${prefix}/*` }]))
  return { applinks: { details: [{ appIDs: [...appIds], components }] } }
}

export interface AssetLink {
  relation: string[]
  target: { namespace: 'android_app'; package_name: string; sha256_cert_fingerprints: string[] }
}

/** The `assetlinks.json` document for one Android package and its signing certificates. */
export function androidAssetLinks(packageName: string, certs: readonly string[]): AssetLink[] {
  return [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: { namespace: 'android_app', package_name: packageName, sha256_cert_fingerprints: [...certs] },
    },
  ]
}
