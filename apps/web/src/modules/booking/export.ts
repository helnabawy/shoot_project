import { BOOKING_STATES } from '@shoot/domain/booking'
import type { Endpoint, Where } from 'payload'
import { csvCell } from '@/modules/brief/export'
import { hasRole } from '@/shared/payload/access'

const columns = ['reference', 'state', 'date', 'location', 'client', 'personas', 'creators', 'totalAed', 'createdAt', 'updatedAt'] as const
const nameOf = (v: unknown, key: string) => (v && typeof v === 'object' ? String((v as Record<string, unknown>)[key] ?? '') : '')

/** GET /api/bookings/export.csv?state=paid — admins download bookings, filtered by state (QM-US4-S3). No phone numbers. */
export const exportBookingsCsv: Endpoint = {
  path: '/export.csv',
  method: 'get',
  handler: async (req) => {
    if (!hasRole(req.user as never, 'admin')) return Response.json({ message: 'Admins only' }, { status: 403 })
    const state = new URL(req.url ?? 'http://x').searchParams.get('state')
    const where: Where | undefined = state && (BOOKING_STATES as readonly string[]).includes(state) ? { state: { equals: state } } : undefined
    const { docs } = await req.payload.find({ collection: 'bookings', where, limit: 10_000, depth: 1, sort: '-createdAt', req, overrideAccess: false })
    const lines = [columns.join(',')]
    for (const b of docs) {
      const row: Record<(typeof columns)[number], unknown> = {
        reference: b.reference,
        state: b.state,
        date: b.date,
        location: b.location,
        client: b.client?.name,
        personas: (b.personas ?? []).map((p) => nameOf(p, 'singular')).join(' + '),
        creators: (b.assignments ?? []).map((a) => nameOf(a.creator, 'displayName') || '—').join(' + '),
        totalAed: b.totalFils == null ? '' : (b.totalFils / 100).toFixed(2),
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      }
      lines.push(columns.map((c) => csvCell(row[c])).join(','))
    }
    return new Response(`﻿${lines.join('\n')}`, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="bookings-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  },
}
