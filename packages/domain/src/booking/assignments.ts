export type AssignmentStatus = 'open' | 'pending' | 'confirmed' | 'declined' | 'lapsed'

/** One professional type of a booking: who is assigned and where their answer stands. */
export interface Assignment {
  personaId: string
  /** Empty: "let us choose" until an admin assigns someone. */
  creatorId: string | null
  status: AssignmentStatus
  respondBy?: string | null
  respondedAt?: string | null
  declineReason?: string | null
}

const HOUR = 60 * 60 * 1000

export function respondByFrom(start: Date, confirmHours: number): string {
  return new Date(start.getTime() + confirmHours * HOUR).toISOString()
}

/** At quotation time: a chosen creator is pending (no deadline yet), "let us choose" is open. */
export function initialAssignments(picks: readonly { personaId: string; creatorId: string | null }[]): Assignment[] {
  return picks.map((p) => ({ personaId: p.personaId, creatorId: p.creatorId, status: p.creatorId ? 'pending' : 'open', respondBy: null, respondedAt: null, declineReason: null }))
}

/** On acceptance the confirmation window starts for every assigned creator. */
export function startAssignments(list: readonly Assignment[], acceptedAt: Date, confirmHours: number): Assignment[] {
  return list.map((a) => (a.creatorId && a.status === 'pending' ? { ...a, respondBy: respondByFrom(acceptedAt, confirmHours) } : a))
}

export type AssignmentRefusal = 'not-assigned' | 'not-pending'

export function respond(
  list: readonly Assignment[],
  personaId: string,
  creatorId: string,
  decision: 'confirm' | 'decline',
  now: Date,
  reason?: string | null,
): { ok: true; assignments: Assignment[] } | { ok: false; reason: AssignmentRefusal } {
  const current = list.find((a) => a.personaId === personaId)
  if (!current || current.creatorId !== creatorId) return { ok: false, reason: 'not-assigned' }
  if (current.status !== 'pending') return { ok: false, reason: 'not-pending' }
  const next: Assignment =
    decision === 'confirm'
      ? { ...current, status: 'confirmed', respondedAt: now.toISOString() }
      : { ...current, status: 'declined', respondedAt: now.toISOString(), declineReason: reason?.slice(0, 200) || null }
  return { ok: true, assignments: list.map((a) => (a.personaId === personaId ? next : a)) }
}

/** Pending answers past their deadline lapse (the client is then offered someone else). */
export function lapseOverdue(list: readonly Assignment[], now: Date): { assignments: Assignment[]; lapsed: string[] } {
  const lapsed: string[] = []
  const assignments = list.map((a) => {
    if (a.status === 'pending' && a.respondBy && new Date(a.respondBy).getTime() < now.getTime()) {
      lapsed.push(a.personaId)
      return { ...a, status: 'lapsed' as const }
    }
    return a
  })
  return { assignments, lapsed }
}

/** A new creator for one type (client's pick or admin's reassignment); the window restarts when it is running. */
export function reassign(list: readonly Assignment[], personaId: string, creatorId: string, now: Date, confirmHours: number, windowRunning: boolean): Assignment[] {
  return list.map((a) =>
    a.personaId === personaId
      ? { ...a, creatorId, status: 'pending', respondBy: windowRunning ? respondByFrom(now, confirmHours) : null, respondedAt: null, declineReason: null }
      : a,
  )
}

export function allConfirmed(list: readonly Assignment[]): boolean {
  return list.length > 0 && list.every((a) => a.status === 'confirmed')
}

/** Types still waiting for a creator: "let us choose", declined or lapsed. */
export function needsCreator(list: readonly Assignment[]): string[] {
  return list.filter((a) => a.status === 'open' || a.status === 'declined' || a.status === 'lapsed').map((a) => a.personaId)
}
