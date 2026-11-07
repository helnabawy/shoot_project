import type { Endpoint } from 'payload'
import { hasRole } from '@/shared/payload/access'

const columns = ['reference', 'createdAt', 'status', 'locale', 'sentence', 'date', 'member', 'sourcePath'] as const

export const csvCell = (value: unknown) => {
  const text = value === null || value === undefined ? '' : String(value)
  // Quote, double embedded quotes, and neutralise spreadsheet formulas.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text
  return `"${safe.replace(/"/g, '""')}"`
}

/** GET /api/briefs/export.csv — admins download every brief (FR-052). */
export const exportBriefsCsv: Endpoint = {
  path: '/export.csv',
  method: 'get',
  handler: async (req) => {
    if (!hasRole(req.user as never, 'admin')) return Response.json({ message: 'Admins only' }, { status: 403 })
    const { docs } = await req.payload.find({ collection: 'briefs', limit: 10_000, depth: 0, sort: '-createdAt', req })
    const lines = [columns.join(',')]
    for (const brief of docs) {
      lines.push(columns.map((c) => csvCell((brief as unknown as Record<string, unknown>)[c])).join(','))
    }
    return new Response(`﻿${lines.join('\n')}`, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="briefs-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  },
}
