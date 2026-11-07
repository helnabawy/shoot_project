import { ValidationError, type CollectionBeforeValidateHook, type PayloadRequest } from 'payload'

/** The values of an option set (`durations`, `locations`), so price rows use the brief builder's vocabulary. */
export async function optionValues(req: PayloadRequest, slug: string): Promise<string[]> {
  const { docs } = await req.payload.find({ collection: 'option-sets', where: { slug: { equals: slug } }, limit: 1, depth: 0, req, overrideAccess: true })
  return (docs[0]?.options ?? []).map((o) => o.value)
}

/** Rejects a value outside the option set with a message key (QM-FR-009). */
export const requireOptionValue =
  (collection: 'service-tiers' | 'travel-fees', field: string, optionSet: string, message: string): CollectionBeforeValidateHook =>
  async ({ data, originalDoc, req }) => {
    const value = (data?.[field] ?? originalDoc?.[field]) as string | undefined
    if (value === undefined) return data
    if (!(await optionValues(req, optionSet)).includes(value)) {
      throw new ValidationError({ collection, errors: [{ path: field, message }], req })
    }
    return data
  }
