import type { Block, Field } from 'payload'
import { anchorField } from '@/shared/payload/fields/anchor'
import { ctaGroup } from '@/shared/payload/fields/cta'
import { glyphField } from '@/shared/payload/fields/glyph'

const heading = (required = true): Field => ({ name: 'heading', type: 'text', localized: true, required })
const subheading: Field = { name: 'subheading', type: 'textarea', localized: true }
const optionalCta = (name = 'cta'): Field => ({
  ...ctaGroup(name),
  admin: { description: 'Leave the label empty to hide this action.' },
})

export const HowItWorks: Block = {
  slug: 'howItWorks',
  interfaceName: 'HowItWorksBlock',
  labels: { singular: 'How it works', plural: 'How it works' },
  fields: [
    anchorField('how-it-works'),
    heading(),
    subheading,
    {
      name: 'steps',
      type: 'array',
      minRows: 1,
      maxRows: 6,
      fields: [
        { name: 'title', type: 'text', required: true, localized: true },
        { name: 'body', type: 'textarea', localized: true },
      ],
    },
    optionalCta(),
  ],
}

export const Features: Block = {
  slug: 'features',
  interfaceName: 'FeaturesBlock',
  labels: { singular: 'Why us', plural: 'Why us' },
  fields: [
    anchorField('why-us'),
    heading(),
    subheading,
    {
      name: 'items',
      type: 'array',
      maxRows: 8,
      fields: [
        { name: 'title', type: 'text', required: true, localized: true },
        { name: 'body', type: 'textarea', localized: true },
        glyphField(),
      ],
    },
  ],
}

export const CategoriesGrid: Block = {
  slug: 'categoriesGrid',
  interfaceName: 'CategoriesGridBlock',
  labels: { singular: 'Specialties', plural: 'Specialties' },
  fields: [
    anchorField('specialties'),
    heading(),
    subheading,
    {
      name: 'source',
      type: 'select',
      defaultValue: 'active',
      options: [
        { label: 'Every specialty of the active personas', value: 'active' },
        { label: 'Pick specialties', value: 'manual' },
      ],
    },
    {
      name: 'categories',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
      admin: { condition: (_d, sibling) => sibling?.source === 'manual' },
    },
    optionalCta(),
  ],
}

export const PersonaBand: Block = {
  slug: 'personaBand',
  interfaceName: 'PersonaBandBlock',
  labels: { singular: 'For professionals', plural: 'For professionals' },
  fields: [
    anchorField('for-professionals'),
    { ...(heading() as object), admin: { description: 'You can use {persona.singular} and {personas.list}.' } } as Field,
    { name: 'body', type: 'textarea', localized: true },
    {
      name: 'layout',
      type: 'select',
      defaultValue: 'combined',
      options: [
        { label: 'One invitation for every active persona', value: 'combined' },
        { label: 'One row per persona', value: 'perPersona' },
      ],
    },
    optionalCta(),
  ],
}

export const Faq: Block = {
  slug: 'faq',
  interfaceName: 'FaqBlock',
  labels: { singular: 'FAQ', plural: 'FAQs' },
  fields: [
    anchorField('faq'),
    heading(),
    {
      name: 'items',
      type: 'array',
      fields: [
        { name: 'question', type: 'text', required: true, localized: true },
        { name: 'answer', type: 'richText', localized: true },
      ],
    },
  ],
}

export const LogoCloud: Block = {
  slug: 'logoCloud',
  interfaceName: 'LogoCloudBlock',
  labels: { singular: 'Logos', plural: 'Logos' },
  fields: [
    anchorField('trusted-by'),
    heading(),
    {
      name: 'logos',
      type: 'array',
      admin: { description: 'Only real clients who agreed to be shown.' },
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'image', type: 'upload', relationTo: 'media', required: true },
        { name: 'imageDark', type: 'upload', relationTo: 'media' },
      ],
    },
  ],
}

export const RichTextBlock: Block = {
  slug: 'richText',
  interfaceName: 'RichTextBlock',
  labels: { singular: 'Text', plural: 'Text' },
  fields: [anchorField(undefined, false), { name: 'content', type: 'richText', localized: true }],
}

export const CallToAction: Block = {
  slug: 'callToAction',
  interfaceName: 'CallToActionBlock',
  labels: { singular: 'Call to action', plural: 'Calls to action' },
  fields: [anchorField(undefined, false), heading(), { name: 'body', type: 'textarea', localized: true }, ctaGroup('primary'), optionalCta('secondary')],
}

export const landingBlocks: Block[] = [HowItWorks, Features, CategoriesGrid, PersonaBand, Faq, LogoCloud, RichTextBlock, CallToAction]
