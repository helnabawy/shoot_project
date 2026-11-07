import type { TextField } from 'payload'
import { validateSlug } from './slug'

/** In-page anchor (#how-it-works) shared by both languages (FR-004). */
export const anchorField = (defaultValue?: string, required = true): TextField => ({
  name: 'anchor',
  type: 'text',
  required,
  defaultValue,
  validate: (value: unknown) => (!value && !required ? true : validateSlug(value)),
  admin: { description: 'Used for links like "#how-it-works". Lowercase letters, numbers and dashes.' },
})
