import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { APP_LINK_HOMES, APP_LINK_PREFIXES, androidAssetLinks, appleAssociation } from './app-links'

const FILE = join(import.meta.dirname, 'examples', 'app-links.json')
const CERT = 'AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89'

describe('MR-US5-S5 the association documents', () => {
  it('lists every prefix for one app id, homes exact and the rest with their subpaths', () => {
    const doc = appleAssociation(['ABCDE12345.ae.shoot.mobile'])
    const [detail] = doc.applinks.details
    expect(doc.applinks.details).toHaveLength(1)
    expect(detail?.appIDs).toEqual(['ABCDE12345.ae.shoot.mobile'])
    expect(detail?.components).toContainEqual({ '/': '/' })
    expect(detail?.components).not.toContainEqual({ '/': '/*' })
    expect(detail?.components).not.toContainEqual({ '/': '/ar/*' })
    expect(detail?.components).toContainEqual({ '/': '/ar/creators/*' })
    expect(detail?.components).toHaveLength(APP_LINK_HOMES.length + (APP_LINK_PREFIXES.length - APP_LINK_HOMES.length) * 2)
  })

  it('carries two app ids in one detail', () => {
    expect(appleAssociation(['A.one', 'B.two']).applinks.details[0]?.appIDs).toEqual(['A.one', 'B.two'])
  })

  it('builds the asset links for one and for two fingerprints', () => {
    expect(androidAssetLinks('ae.shoot.mobile', [CERT])).toEqual([
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: { namespace: 'android_app', package_name: 'ae.shoot.mobile', sha256_cert_fingerprints: [CERT] },
      },
    ])
    expect(androidAssetLinks('ae.shoot.mobile', [CERT, CERT.toLowerCase()])[0]?.target.sha256_cert_fingerprints).toHaveLength(2)
  })
})

describe('MR-US5-S6 the app-links example the app configuration is checked against', () => {
  it('prefixes cover each base path in English and Arabic, without duplicates', () => {
    expect(new Set(APP_LINK_PREFIXES).size).toBe(APP_LINK_PREFIXES.length)
    expect(APP_LINK_PREFIXES).toEqual(expect.arrayContaining(['/', '/ar', '/creators', '/ar/creators', '/q', '/ar/q']))
  })

  it('examples/app-links.json equals APP_LINK_PREFIXES (UPDATE_API_SNAPSHOT=1 rewrites it)', () => {
    const expected = { prefixes: [...APP_LINK_PREFIXES] }
    if (process.env.UPDATE_API_SNAPSHOT === '1' || !existsSync(FILE)) writeFileSync(FILE, `${JSON.stringify(expected, null, 2)}\n`)
    expect(JSON.parse(readFileSync(FILE, 'utf8'))).toEqual(expected)
  })
})
