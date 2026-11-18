/** Where each part of the creator home goes, already localised by the page. */
export interface HomeHrefs {
  /** The home itself, for the form's "Back". */
  home: string
  /** The card's Decline step: the home with `?decline=` and the answer anchor. */
  decline: (key: string) => string
  bookings: string
  booking: (ref: string) => string
  availability: string
  profile: string
  inbox: string
}

/** Which request the Decline step is open for: a booking's reference, or a brief's reference and type. */
export const declineKey = (item: { ref: string; persona: string | null }) => (item.persona ? `${item.ref}:${item.persona}` : item.ref)
