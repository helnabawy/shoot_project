import { APIError, type CollectionBeforeDeleteHook } from 'payload'

/** FR-029: personas and categories cannot be deleted while something references them. */
export const refuseDeleteWhileReferenced =
  (checks: (args: Parameters<CollectionBeforeDeleteHook>[0]) => Promise<string[]>): CollectionBeforeDeleteHook =>
  async (args) => {
    const references = await checks(args)
    if (references.length > 0) {
      throw new APIError(
        `This item is still used by ${references.join(', ')}. Deactivate it instead, or remove those references first.`,
        400,
        undefined,
        true,
      )
    }
  }
