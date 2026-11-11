// How each variant's reference is derived from the English light board (research R5, R6).
import type { HtmlTransform } from './board'
import type { Variant } from './manifest'

/** English light only in phase 3 of 007; dark and Arabic transforms join in US2. */
export function transformsFor(variant: Variant): HtmlTransform[] {
  if (variant === 'en-light') return []
  throw new Error(`variant ${variant} is not derived yet`)
}

/** The variants of [variants] that can be derived today. */
export function derivedVariants(variants: Variant[]): Variant[] {
  return variants.filter((v) => {
    try {
      transformsFor(v)
      return true
    } catch {
      return false
    }
  })
}
