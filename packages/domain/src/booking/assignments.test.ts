import { describe, expect, it } from 'vitest'
import { allConfirmed, initialAssignments, lapseOverdue, needsCreator, reassign, respond, startAssignments, type Assignment } from './assignments'

const t0 = new Date('2026-11-07T10:00:00Z')
const base = initialAssignments([
  { personaId: 'p', creatorId: 'c1' },
  { personaId: 'v', creatorId: null },
])

describe('QM-US3-S1 assignments and confirmation', () => {
  it('starts pending for chosen creators and open for "let us choose"', () => {
    expect(base.map((a) => a.status)).toEqual(['pending', 'open'])
    const started = startAssignments(base, t0, 24)
    expect(started[0]?.respondBy).toBe('2026-11-08T10:00:00.000Z')
    expect(started[1]?.respondBy).toBeNull()
  })

  it('confirm and decline by the assigned creator', () => {
    const started = startAssignments(base, t0, 24)
    const c = respond(started, 'p', 'c1', 'confirm', t0)
    expect(c.ok && c.assignments[0]).toMatchObject({ status: 'confirmed', respondedAt: t0.toISOString() })
    const d = respond(started, 'p', 'c1', 'decline', t0, 'x'.repeat(300))
    expect(d.ok && d.assignments[0]?.status).toBe('declined')
    expect(d.ok && d.assignments[0]?.declineReason?.length).toBe(200)
    const e = respond(started, 'p', 'c1', 'decline', t0, '')
    expect(e.ok && e.assignments[0]?.declineReason).toBeNull()
  })

  it('refuses another creator and a second answer', () => {
    const started = startAssignments(base, t0, 24)
    expect(respond(started, 'p', 'c2', 'confirm', t0)).toEqual({ ok: false, reason: 'not-assigned' })
    expect(respond(started, 'x', 'c1', 'confirm', t0)).toEqual({ ok: false, reason: 'not-assigned' })
    const once = respond(started, 'p', 'c1', 'confirm', t0)
    if (!once.ok) throw new Error('expected ok')
    expect(respond(once.assignments, 'p', 'c1', 'decline', t0)).toEqual({ ok: false, reason: 'not-pending' })
  })

  it('allConfirmed only when every type is confirmed', () => {
    const all: Assignment[] = [
      { personaId: 'p', creatorId: 'c1', status: 'confirmed' },
      { personaId: 'v', creatorId: 'c2', status: 'confirmed' },
    ]
    expect(allConfirmed(all)).toBe(true)
    expect(allConfirmed([...all.slice(0, 1), { personaId: 'v', creatorId: 'c2', status: 'pending' }])).toBe(false)
    expect(allConfirmed([])).toBe(false)
  })
})

describe('QM-US3-S2 lapses and reassignment', () => {
  it('lapses pending answers past respondBy only', () => {
    const started = startAssignments(base, t0, 24)
    expect(lapseOverdue(started, new Date('2026-11-08T09:00:00Z')).lapsed).toEqual([])
    const r = lapseOverdue(started, new Date('2026-11-08T11:00:00Z'))
    expect(r.lapsed).toEqual(['p'])
    expect(r.assignments[0]?.status).toBe('lapsed')
    expect(r.assignments[1]?.status).toBe('open')
  })

  it('reassign restarts the window only while it runs', () => {
    const running = reassign(base, 'v', 'c9', t0, 24, true)
    expect(running[1]).toMatchObject({ creatorId: 'c9', status: 'pending', respondBy: '2026-11-08T10:00:00.000Z' })
    const notYet = reassign(base, 'v', 'c9', t0, 24, false)
    expect(notYet[1]?.respondBy).toBeNull()
    expect(notYet[0]).toBe(base[0])
  })

  it('needsCreator lists open, declined and lapsed types', () => {
    expect(needsCreator(base)).toEqual(['v'])
    expect(needsCreator([{ personaId: 'p', creatorId: 'c', status: 'declined' }, { personaId: 'v', creatorId: 'c', status: 'lapsed' }, { personaId: 'x', creatorId: 'c', status: 'confirmed' }])).toEqual(['p', 'v'])
  })
})
