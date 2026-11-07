import type { CreatorSummary } from '@shoot/domain/creators'

/** A creator row as step 2 shows it (prepared on the server). */
export interface PickRowView {
  id: string
  code: string
  displayCode: string
  name: string
  initials: string
  photo: CreatorSummary['photo']
  meta: string
  href: string
  chosen: boolean
}

export interface MatchSectionView {
  personaId: string
  /** "Photographers" for the group label. */
  plural: string
  /** "photographer" for "Let us choose". */
  singular: string
  /** The one price for this type, formatted, or null for "price on request". */
  price: string | null
  deliverables: string[]
  creators: PickRowView[]
  anyHref: string
  anyChosen: boolean
}
