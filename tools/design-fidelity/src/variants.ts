// How each variant's reference is derived from the English light board (research R5, R6).
import type { Page } from '@playwright/test'
import type { Screen, Variant } from './manifest'
import { tokenise } from './tokenise'

/**
 * Variants that can be derived today. Arabic waits for the owner's decision on validating the
 * derivation (boards 42 and 43 are not pure variants of 21 and 13; see research R6).
 */
export const DERIVED: readonly Variant[] = ['en-light', 'en-dark']

export function derivedVariants(variants: Variant[]): Variant[] {
  return variants.filter((v) => DERIVED.includes(v))
}

/** Applies the variant's transforms to the loaded board. */
export async function prepareVariant(page: Page, screen: Screen, variant: Variant): Promise<void> {
  if (variant === 'en-light') return
  if (variant === 'en-dark') return tokenise(page, screen, true)
  throw new Error(`variant ${variant} of screen ${screen.id} is not derived yet`)
}
