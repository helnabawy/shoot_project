/** FR-052: download every brief as CSV (admins only; the endpoint checks the role). */
export function BriefsExport() {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '0 0 12px' }}>
      <a href="/api/briefs/export.csv" className="btn btn--style-secondary btn--size-small" download>
        Download CSV
      </a>
    </div>
  )
}
