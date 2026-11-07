import { ValidationError, type FieldHook, type TextField } from 'payload'

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function validateSlug(value: unknown): true | string {
  return typeof value === 'string' && SLUG_PATTERN.test(value)
    ? true
    : 'Use lowercase letters, numbers and single dashes (for example "wedding-engagement").'
}

/** Slugs are stable identifiers: once saved they never change (seeds, briefs and URLs rely on them). */
export const preventSlugChange: FieldHook = ({ value, originalDoc, operation, field, req }) => {
  const name = ('name' in field && field.name) || 'slug'
  const previous = originalDoc?.[name]
  if (operation === 'update' && previous && value !== undefined && value !== previous) {
    throw new ValidationError({
      collection: undefined,
      errors: [{ path: name, message: `The ${name} cannot be changed after it is created.` }],
      req,
    })
  }
  return value
}

export function slugField(overrides: Partial<TextField> = {}): TextField {
  return {
    name: 'slug',
    type: 'text',
    required: true,
    unique: true,
    index: true,
    validate: validateSlug,
    hooks: { beforeChange: [preventSlugChange] },
    admin: {
      position: 'sidebar',
      description: 'Stable identifier used by the site and seeds. It cannot be changed after saving.',
    },
    ...overrides,
  } as TextField
}
