import type { LandingPage, SiteSetting } from '@/payload-types'

export const settingsFixture = {
  id: 1,
  siteName: 'Shoot Project',
  whatsappNumber: '+971500000000',
  whatsappDefaultMessage: "Hi! I'd like to book a shoot.",
  expectedReplyTime: 'shortly',
  labels: { providerLabel: "I'm a {persona.singular}", seekerLabel: 'I need a {persona.singular}' },
} as unknown as SiteSetting

export const personasFixture = [
  { id: '1', slug: 'photographer', singular: 'Photographer', plural: 'Photographers', order: 1, active: true, glyph: 'PH', copy: { providerCta: "I'm a {persona.singular}" } },
  { id: '2', slug: 'videographer', singular: 'Videographer', plural: 'Videographers', order: 2, active: true, glyph: 'VI', copy: { providerCta: "I'm a {persona.singular}" } },
  { id: '3', slug: 'teacher', singular: 'Teacher', plural: 'Teachers', order: 3, active: true, glyph: 'TE', copy: { providerCta: "I'm a {persona.singular}" } },
]

const paragraph = (text: string) => ({
  root: { type: 'root', format: '', indent: 0, version: 1, direction: 'ltr', children: [{ type: 'paragraph', format: '', indent: 0, version: 1, direction: 'ltr', textFormat: 0, children: [{ type: 'text', text, format: 0, detail: 0, mode: 'normal', style: '', version: 1 }] }] },
})

export const sectionsFixture: NonNullable<LandingPage['sections']> = [
  { blockType: 'howItWorks', id: 'a', anchor: 'how-it-works', heading: 'How it works', steps: [{ id: 's1', title: 'Brief', body: 'One line.' }, { id: 's2', title: 'Match' }] },
  { blockType: 'howItWorks', id: 'empty', anchor: 'empty-steps', heading: 'Nothing', steps: [] },
  { blockType: 'features', id: 'b', anchor: 'why-us', heading: 'Why us', items: [{ id: 'i1', title: 'One sentence', glyph: '1' }] },
  { blockType: 'categoriesGrid', id: 'c', anchor: 'specialties', heading: 'Specialties', source: 'active' },
  { blockType: 'personaBand', id: 'd', anchor: 'for-professionals', heading: 'Are you a {personas.list}?', layout: 'perPersona', cta: { label: 'Join', kind: 'link', href: '/register' } },
  { blockType: 'faq', id: 'e', anchor: 'faq', heading: 'Questions', items: [{ id: 'q1', question: 'Do I need an account?', answer: paragraph('No.') as never }] },
  { blockType: 'logoCloud', id: 'f', anchor: 'trusted-by', heading: 'Clients', logos: [] },
  { blockType: 'callToAction', id: 'g', heading: 'Ready', body: 'Message us', primary: { label: 'Start a brief', kind: 'link', href: '#brief' }, secondary: { label: 'WhatsApp us', kind: 'whatsapp' } },
  { blockType: 'mystery', id: 'h' } as never,
] as never
