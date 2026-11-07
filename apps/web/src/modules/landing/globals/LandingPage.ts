import { checkSentenceSlots } from '@shoot/domain/brief'
import { ValidationError, type Access, type GlobalBeforeChangeHook, type GlobalBeforeValidateHook, type GlobalConfig } from 'payload'
import { hasRole, isEditor } from '@/shared/payload/access'
import { ctaGroup } from '@/shared/payload/fields/cta'
import { revalidateLandingPage } from '@/shared/payload/hooks/revalidate'
import { landingBlocks } from '../blocks'

/** Visitors read only the published version; editors also read drafts (FR-015). */
const readPublished: Access = ({ req }) =>
  hasRole(req.user as never, 'admin', 'editor') ? true : { _status: { equals: 'published' } }

type SectionLike = { anchor?: string | null }
type SlotLike = { token?: string | null }

const validateStructure: GlobalBeforeValidateHook = ({ data, req }) => {
  const errors: { path: string; message: string }[] = []
  const anchors = ((data?.sections ?? []) as SectionLike[]).map((s) => s.anchor).filter(Boolean) as string[]
  const repeated = anchors.filter((a, i) => anchors.indexOf(a) !== i)
  if (repeated.length) {
    errors.push({ path: 'sections', message: `Each section needs its own anchor (repeated: ${[...new Set(repeated)].join(', ')}).` })
  }
  const builder = data?.briefBuilder as { sentence?: string; slots?: SlotLike[]; enabled?: boolean } | undefined
  if (builder?.sentence && builder.enabled !== false) {
    const tokens = (builder.slots ?? []).map((s) => s.token).filter(Boolean) as string[]
    const { missingSlots, unusedSlots } = checkSentenceSlots(builder.sentence, tokens)
    if (missingSlots.length) {
      errors.push({ path: 'briefBuilder.sentence', message: `These words in the sentence have no slot: ${missingSlots.map((t) => `{${t}}`).join(', ')}.` })
    }
    if (unusedSlots.length) {
      errors.push({ path: 'briefBuilder.slots', message: `These slots are not in the sentence: ${unusedSlots.map((t) => `{${t}}`).join(', ')}.` })
    }
  }
  if (errors.length) throw new ValidationError({ global: 'landing-page', errors, req })
  return data
}

/** Records who published and when (FR-018). */
const stampPublish: GlobalBeforeChangeHook = ({ data, req }) => {
  if (data?._status === 'published') {
    return { ...data, publishedAt: new Date().toISOString(), publishedBy: req.user?.id ?? null }
  }
  return data
}

export const LandingPage: GlobalConfig = {
  slug: 'landing-page',
  label: 'Landing page',
  admin: {
    group: 'Content',
    description: 'Everything on the home page, in English and Arabic.',
    // Editors preview drafts on the real site (FR-013); the route also checks their session.
    preview: (_doc, { locale }) => `/next/preview?secret=${process.env.PREVIEW_SECRET ?? ''}&path=${locale === 'ar' ? '/ar' : '/'}`,
  },
  access: { read: readPublished, update: isEditor, readVersions: isEditor },
  versions: { drafts: true, max: 50 },
  hooks: { beforeValidate: [validateStructure], beforeChange: [stampPublish], afterChange: [revalidateLandingPage] },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Hero',
          name: 'hero',
          fields: [
            { name: 'eyebrow', type: 'text', localized: true },
            {
              name: 'headline',
              type: 'text',
              required: true,
              localized: true,
              maxLength: 80,
              defaultValue: 'You brief. We shoot.',
              admin: { description: 'Keep it short: 80 characters at most.' },
            },
            { name: 'subheadline', type: 'textarea', localized: true, maxLength: 300 },
            {
              name: 'trustChips',
              type: 'array',
              maxRows: 3,
              fields: [{ name: 'text', type: 'text', required: true, localized: true, maxLength: 40 }],
            },
            {
              name: 'layout',
              type: 'select',
              defaultValue: 'briefBuilder',
              options: [
                { label: 'Brief builder (recommended)', value: 'briefBuilder' },
                { label: 'Two buttons', value: 'ctas' },
              ],
            },
            { ...ctaGroup('primaryCta', 'Primary action'), admin: { condition: (_d, s) => s?.layout === 'ctas' } },
            { ...ctaGroup('secondaryCta', 'Secondary action'), admin: { condition: (_d, s) => s?.layout === 'ctas' } },
            { type: 'row', fields: [
              { name: 'image', type: 'upload', relationTo: 'media' },
              { name: 'imageMobile', type: 'upload', relationTo: 'media' },
            ] },
          ],
        },
        {
          label: 'Brief builder',
          name: 'briefBuilder',
          fields: [
            { name: 'enabled', type: 'checkbox', defaultValue: true },
            {
              name: 'sentence',
              type: 'text',
              localized: true,
              defaultValue: 'I need a {persona} for {occasion} on {date} for {duration} in {location}, shot by {shotBy}.',
              admin: {
                description:
                  'Each {word} in braces is a part the visitor picks. Every {word} needs a slot below with the same token, and every slot must appear here.',
              },
            },
            {
              name: 'slots',
              type: 'array',
              labels: { singular: 'Slot', plural: 'Slots' },
              fields: [
                { type: 'row', fields: [
                  { name: 'token', type: 'text', required: true, admin: { width: '25%', description: 'Matches {token} in the sentence.' } },
                  {
                    name: 'kind',
                    type: 'select',
                    required: true,
                    defaultValue: 'options',
                    admin: { width: '25%' },
                    options: [
                      { label: 'Professional type', value: 'persona' },
                      { label: 'Option set', value: 'options' },
                      { label: 'Date', value: 'date' },
                      { label: 'Number', value: 'number' },
                    ],
                  },
                  {
                    name: 'optionSet',
                    type: 'relationship',
                    relationTo: 'option-sets',
                    admin: { width: '50%', condition: (_d, s) => s?.kind === 'options' },
                  },
                ] },
                { type: 'row', fields: [
                  { name: 'groupLabel', type: 'text', localized: true, admin: { width: '34%', description: 'Heading above the options, e.g. "Occasion".' } },
                  { name: 'placeholder', type: 'text', localized: true, admin: { width: '33%', description: 'The question in the field while this step is asked, e.g. "what occasion"; also the skip row of an optional step, e.g. "any date".' } },
                  { name: 'defaultValue', type: 'text', admin: { width: '33%', description: 'Option value or persona slug listed first in its step (nothing is pre-selected).' } },
                ] },
                { type: 'row', fields: [
                  { name: 'required', type: 'checkbox', defaultValue: true },
                  { name: 'allowCustom', type: 'checkbox', defaultValue: false, admin: { description: 'Let visitors type their own words.' } },
                  {
                    name: 'multiple',
                    type: 'checkbox',
                    defaultValue: false,
                    admin: {
                      description: 'Let visitors pick more than one, e.g. a photographer and a videographer.',
                      condition: (_d, s) => s?.kind === 'persona',
                    },
                  },
                ] },
              ],
            },
            { name: 'submitLabel', type: 'text', localized: true, defaultValue: "See who's free" },
            { name: 'helperText', type: 'text', localized: true },
            {
              name: 'whatsappTemplate',
              type: 'textarea',
              localized: true,
              admin: { description: 'The WhatsApp message sent with the brief. Uses the same {words} as the sentence.' },
            },
            { name: 'successMessage', type: 'textarea', localized: true },
            {
              name: 'steps',
              type: 'array',
              maxRows: 4,
              admin: { description: 'Optional outline of what happens after the brief (only step 1 is interactive).' },
              fields: [
                { name: 'title', type: 'text', required: true, localized: true },
                { name: 'description', type: 'text', localized: true },
              ],
            },
          ],
        },
        {
          label: 'Sections',
          fields: [
            {
              name: 'navigation',
              type: 'array',
              admin: { description: 'Links in the header. Use "#anchor" for sections or a path like "/register".' },
              fields: [
                { type: 'row', fields: [
                  { name: 'label', type: 'text', required: true, localized: true },
                  { name: 'target', type: 'text', required: true },
                ] },
              ],
            },
            { name: 'sections', type: 'blocks', blocks: landingBlocks },
          ],
        },
        {
          label: 'SEO',
          name: 'seo',
          fields: [
            { name: 'title', type: 'text', localized: true, maxLength: 60 },
            { name: 'description', type: 'textarea', localized: true, maxLength: 160 },
            { name: 'ogImage', type: 'upload', relationTo: 'media' },
          ],
        },
      ],
    },
    {
      name: 'translationStatus',
      type: 'ui',
      admin: { position: 'sidebar', components: { Field: '/modules/admin/components/UntranslatedFields#UntranslatedFields' } },
    },
    { name: 'publishedAt', type: 'date', admin: { readOnly: true, position: 'sidebar' } },
    { name: 'publishedBy', type: 'relationship', relationTo: 'users', admin: { readOnly: true, position: 'sidebar' } },
  ],
}
