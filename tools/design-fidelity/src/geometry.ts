// The geometry gate: every key element within ±tolerance logical px on x, y, w and h (FR-043).
export type Box = { x: number; y: number; w: number; h: number }
export type BoxDelta = { dx: number; dy: number; dw: number; dh: number }

export function compareBoxes(
  board: Record<string, Box>,
  app: Record<string, Box>,
  tolerance: number,
): { deltas: Record<string, BoxDelta>; failures: string[] } {
  const deltas: Record<string, BoxDelta> = {}
  const failures: string[] = []
  const round = (n: number) => Math.round(n * 100) / 100
  for (const name of new Set([...Object.keys(board), ...Object.keys(app)])) {
    const b = board[name]
    const a = app[name]
    if (!b || !a) {
      failures.push(`${name}: missing on the ${b ? 'app' : 'board'} side`)
      continue
    }
    const d = { dx: round(a.x - b.x), dy: round(a.y - b.y), dw: round(a.w - b.w), dh: round(a.h - b.h) }
    deltas[name] = d
    const off = Object.entries(d).filter(([, v]) => Math.abs(v) > tolerance)
    if (off.length) failures.push(`${name}: ${off.map(([k, v]) => `${k}=${v}`).join(' ')} (tolerance ±${tolerance}px)`)
  }
  return { deltas, failures }
}
