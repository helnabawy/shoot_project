import type { TextField } from 'payload'

/** Short text shown in a row's glyph tile ("W", "2h", "DXB"); The Brief Bar uses no icon sets. */
export const glyphField = (): TextField => ({
  name: 'glyph',
  type: 'text',
  // Visible text: each language gets its own letters (Arabic rows lead with an Arabic letter).
  localized: true,
  maxLength: 3,
  admin: { description: 'Up to 3 characters shown in the small tile at the start of the row, e.g. "W" or "DXB".' },
})
