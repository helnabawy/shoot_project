// Lighthouse budgets for the Quick Match private pages (feature 003, T073).
// Their links carry a key derived from PAYLOAD_SECRET (specs/003-quick-match-booking/research.md §2), so the
// URLs are built here from the demo seed's fixed salt (apps/web/src/shared/payload/seed/quick-match.ts).
// LHCI_THEME=dark measures the dark theme. Same budgets as lighthouserc.json.
const { createHmac } = require('node:crypto')
const base = require('./lighthouserc.json')
const dark = require('./lighthouserc.dark.json')

const SALT = 'demo-quick-match-salt'
const secret = process.env.PAYLOAD_SECRET
if (!secret) throw new Error('PAYLOAD_SECRET is required to build the Quick Match Lighthouse URLs.')
const key = (purpose) => createHmac('sha256', secret).update(`${purpose}:${SALT}`).digest('base64url')
const site = (process.env.LHCI_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
const paths = [`/match/B-D2222/${key('brief')}`, `/q/Q-D2222/${key('booking')}`]
const url = [...paths, ...paths.map((p) => `/ar${p}`)].map((p) => `${site}${p}`)
const theme = process.env.LHCI_THEME === 'dark' ? dark : base

module.exports = {
  ci: {
    ...theme.ci,
    collect: { ...theme.ci.collect, url },
  },
}
