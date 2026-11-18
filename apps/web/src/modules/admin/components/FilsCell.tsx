/** A list-view cell for an amount stored in fils: "AED" units with thousands separators, "800.00", "1,705.00". */
export function FilsCell({ cellData }: { cellData?: unknown }) {
  if (typeof cellData !== 'number') return null
  return <span>{(cellData / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
}
