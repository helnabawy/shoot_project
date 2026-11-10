import type { ReactNode } from 'react'

/**
 * The hero backdrop until the CMS has a photo (design 03 · Landing · desktop 1440, and boards 01 and 02
 * for phones): warm sky, a lens as the light with its iris and focus ring, a viewfinder's corners, and
 * an edit timeline as the ground with a playhead running across it. Shapes only, in the `--lens-*`
 * colours (globals.css, "Lens scene"), which have a day and a night set.
 *
 * The phone and the wide screen each get their own composition, as on the boards; CSS shows the one
 * that fits. The drawing is generated from a few numbers rather than stored as paths, so both
 * compositions stay consistent. The lens sits on the end side, so the scene mirrors in Arabic.
 *
 * Motion (globals.css): the iris opens and the corners settle once on arrival; from 1024 px the glow
 * breathes, the focus ring turns, bokeh rises and the playhead runs, under the page's Pause control.
 * Reduced motion stills all of it. Decorative: `aria-hidden`.
 */

interface Track {
  kind: 'video' | 'audio' | 'label'
  y: number
  h: number
  /** Clip widths, repeated along the row. */
  clips?: number[]
}

interface Composition {
  id: string
  w: number
  h: number
  lens: { cx: number; cy: number; r: number }
  glow: number
  /** Viewfinder corners: the box and the arm length. */
  frame: { x1: number; y1: number; x2: number; y2: number; arm: number; stroke: number }
  bokeh: [number, number, number][]
  timeline: { y: number; tick: number; tracks: Track[] }
  /** Playhead start x and its size. */
  head: { x: number; scale: number }
  /**
   * How the drawing meets the stage. The wide one sits on the stage floor; the phone one hangs from
   * the top (minus the board's header strip), so the lens stays beside the readout above the bar.
   */
  fit: { top: number; align: 'xMidYMax' | 'xMidYMin' }
}

const WIDE: Composition = {
  id: 'wide',
  w: 1440,
  h: 900,
  lens: { cx: 802, cy: 548, r: 50 },
  glow: 250,
  frame: { x1: 48, y1: 96, x2: 1392, y2: 716, arm: 28, stroke: 2 },
  bokeh: [
    [180, 380, 14],
    [640, 120, 10],
    [770, 330, 18],
    [960, 420, 9],
    [1384, 300, 12],
    [60, 600, 8],
    [1396, 640, 14],
    [740, 680, 10],
  ],
  timeline: {
    y: 736,
    tick: 10,
    tracks: [
      { kind: 'video', y: 760, h: 48, clips: [310, 254, 154, 284, 194, 234] },
      { kind: 'audio', y: 816, h: 26, clips: [430, 434, 584] },
      { kind: 'video', y: 850, h: 50, clips: [190, 454, 254, 544] },
    ],
  },
  head: { x: 390, scale: 2 },
  fit: { top: 0, align: 'xMidYMax' },
}

const PHONE: Composition = {
  id: 'phone',
  w: 360,
  h: 650,
  lens: { cx: 270, cy: 312, r: 38 },
  glow: 124,
  frame: { x1: 12, y1: 66, x2: 348, y2: 374, arm: 16, stroke: 1.5 },
  bokeh: [
    [44, 196, 9],
    [318, 210, 6],
    [158, 268, 11],
    [70, 352, 5],
    [196, 350, 8],
    [338, 128, 5],
  ],
  timeline: {
    y: 382,
    tick: 6,
    tracks: [
      { kind: 'video', y: 397, h: 26, clips: [92, 83, 63, 91, 70] },
      { kind: 'audio', y: 427, h: 16, clips: [150, 120, 130] },
      { kind: 'video', y: 447, h: 26, clips: [70, 120, 84, 110] },
      { kind: 'label', y: 477, h: 8, clips: [60, 140, 90] },
      { kind: 'audio', y: 489, h: 16, clips: [110, 160, 120] },
      { kind: 'video', y: 509, h: 26, clips: [104, 76, 96, 88] },
      { kind: 'audio', y: 539, h: 16, clips: [170, 90, 140] },
      { kind: 'video', y: 559, h: 26, clips: [66, 98, 120, 80] },
      { kind: 'label', y: 589, h: 8, clips: [120, 60, 150] },
      { kind: 'audio', y: 601, h: 16, clips: [130, 150, 100] },
      { kind: 'video', y: 621, h: 29, clips: [88, 110, 74, 96] },
    ],
  },
  head: { x: 130, scale: 1 },
  fit: { top: 40, align: 'xMidYMin' },
}

const round = (n: number) => Math.round(n * 100) / 100
const polar = (cx: number, cy: number, r: number, deg: number): [number, number] => {
  const a = (deg * Math.PI) / 180
  return [round(cx + r * Math.cos(a)), round(cy + r * Math.sin(a))]
}

/** A steady, repeatable "random" in 0..1, so the waveform is the same on every render. */
const noise = (i: number) => {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

function Lens({ c }: { c: Composition }) {
  const { cx, cy, r } = c.lens
  const ticks = Array.from({ length: 36 }, (_, i) => {
    const [x1, y1] = polar(cx, cy, r * 1.18, i * 10)
    const [x2, y2] = polar(cx, cy, r * (i % 3 === 0 ? 1.4 : 1.3), i * 10)
    return `M${x1} ${y1}L${x2} ${y2}`
  }).join('')
  const vertices = Array.from({ length: 7 }, (_, k) => -78 + (k * 360) / 7)
  const blades = vertices
    .map((a) => {
      const [x, y] = polar(cx, cy, r * 0.56, a)
      const [fx, fy] = polar(x, y, r * 4, a + 116)
      return `M${x} ${y}L${fx} ${fy}`
    })
    .join('')
  const aperture = vertices.map((a) => polar(cx, cy, r * 0.56, a).join(',')).join(' ')
  const [hx1, hy1] = polar(cx, cy, r * 0.84, 200)
  const [hx2, hy2] = polar(cx, cy, r * 0.84, 246)
  const clip = `lens-clip-${c.id}`
  return (
    <>
      <circle className="lens-glow" cx={cx} cy={cy} r={c.glow} fill={`url(#lens-glow-${c.id})`} />
      <g className="lens-ring" fill="none" style={{ transformOrigin: `${cx}px ${cy}px` }}>
        <circle cx={cx} cy={cy} r={round(r * 1.48)} strokeWidth="1.25" />
        <path strokeWidth="1.25" strokeLinecap="round" d={ticks} />
      </g>
      <circle className="lens-disc" cx={cx} cy={cy} r={r} />
      <clipPath id={clip}>
        <circle cx={cx} cy={cy} r={r} />
      </clipPath>
      <g clipPath={`url(#${clip})`}>
        <g className="lens-iris" strokeWidth="1.2" style={{ transformOrigin: `${cx}px ${cy}px` }}>
          <path fill="none" vectorEffect="non-scaling-stroke" d={blades} />
          <polygon vectorEffect="non-scaling-stroke" points={aperture} />
        </g>
      </g>
      <circle className="lens-rim" cx={cx} cy={cy} r={r} fill="none" strokeWidth={round(r * 0.04)} />
      <path
        className="lens-highlight"
        fill="none"
        strokeWidth={round(r * 0.05)}
        strokeLinecap="round"
        d={`M${hx1} ${hy1}A${round(r * 0.84)} ${round(r * 0.84)} 0 0 1 ${hx2} ${hy2}`}
      />
    </>
  )
}

/** One clip on a video track: a frame of thumbnails, each a hill under a sun. */
function VideoClip({ x, y, w, h, seed }: { x: number; y: number; w: number; h: number; seed: number }) {
  const pad = h > 30 ? 4 : 2
  const inner = h - pad * 2
  const n = Math.max(1, Math.round((w - pad * 2) / (inner * 0.8)))
  const tw = (w - pad * 2 - pad * (n - 1)) / n
  const thumbs: ReactNode[] = []
  for (let i = 0; i < n; i++) {
    const tx = round(x + pad + i * (tw + pad))
    const bottom = y + pad + inner
    const peak = (seed + i) % 3 === 0 ? 0.6 : 0.42
    thumbs.push(
      <g key={i}>
        <rect x={tx} y={y + pad} width={round(tw)} height={inner} rx={pad === 4 ? 3 : 1.5} className={i % 2 ? 'lens-thumb-b' : 'lens-thumb-a'} />
        <path
          className="lens-hill"
          d={`M${tx} ${bottom}V${round(bottom - inner * 0.28)}L${round(tx + tw * peak)} ${round(bottom - inner * 0.46)}L${round(tx + tw)} ${round(bottom - inner * 0.2)}V${bottom}z`}
        />
        <circle className="lens-sun" cx={round(tx + tw * ((seed + i) % 2 ? 0.26 : 0.72))} cy={round(y + pad + inner * 0.3)} r={round(inner * 0.11)} />
      </g>,
    )
  }
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={pad === 4 ? 6 : 3} className="lens-clip" />
      {thumbs}
    </g>
  )
}

function Timeline({ c }: { c: Composition }) {
  const { y, tick, tracks } = c.timeline
  const ruler = Array.from({ length: Math.ceil(c.w / tick) }, (_, i) => {
    const x = i * tick + tick / 2
    return `M${x} ${y + 17}v-${i % 5 === 0 ? 12 : 6}`
  }).join('')
  return (
    <g>
      <rect className="lens-track-bed" x="0" y={y} width={c.w} height={c.h - y} />
      <path className="lens-rule" strokeWidth="1" d={`M0 ${y + 0.5}H${c.w}`} />
      <path className="lens-ticks" fill="none" strokeWidth={c.w > 400 ? 2 : 1} d={ruler} />
      {tracks.map((t, ti) => {
        const clips: ReactNode[] = []
        let x = -10
        for (let i = 0; x < c.w; i++) {
          const w = t.clips![i % t.clips!.length]!
          if (t.kind === 'video') clips.push(<VideoClip key={i} x={x} y={t.y} w={w} h={t.h} seed={ti + i} />)
          else
            clips.push(
              <rect key={i} x={x} y={t.y} width={w} height={t.h} rx={t.h > 10 ? 4 : 2} className={t.kind === 'audio' ? 'lens-audio' : 'lens-label'} />,
            )
          x += w + 6
        }
        const wave =
          t.kind === 'audio'
            ? Array.from({ length: Math.floor(c.w / 6) }, (_, i) => {
                const amp = noise(i + ti * 97) < 0.25 ? 0.08 : 0.1 + noise(i * 3 + ti) * 0.33
                const mid = t.y + t.h / 2
                return `M${i * 6 + 4} ${round(mid - t.h * amp)}V${round(mid + t.h * amp)}`
              }).join('')
            : null
        return (
          <g key={ti}>
            {clips}
            {wave ? <path className="lens-wave" fill="none" strokeWidth={c.w > 400 ? 2.8 : 1.6} strokeLinecap="round" d={wave} /> : null}
          </g>
        )
      })}
      <g className="lens-head">
        <g transform={`translate(${c.head.x} ${y - 20 * c.head.scale}) scale(${c.head.scale})`}>
          <path d="M-5 0h10v6l-5 5l-5-5z" />
          <rect x="-0.75" y="6" width="1.5" height={round((c.h - y + 20 * c.head.scale) / c.head.scale)} />
        </g>
      </g>
    </g>
  )
}

function Composed({ c, className }: { c: Composition; className: string }) {
  const { x1, y1, x2, y2, arm, stroke } = c.frame
  return (
    <svg
      focusable="false"
      viewBox={`0 ${c.fit.top} ${c.w} ${c.h - c.fit.top}`}
      preserveAspectRatio={`${c.fit.align} slice`}
      className={`lens-scene-${c.id} absolute inset-0 size-full rtl:-scale-x-100 ${className}`}
    >
      <defs>
        <linearGradient id={`lens-sky-${c.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="scene-stop-top" />
          <stop offset="0.6" className="scene-stop-mid" />
          <stop offset="1" className="scene-stop-low" />
        </linearGradient>
        <radialGradient id={`lens-glow-${c.id}`}>
          <stop offset="0" className="lens-glow-a" />
          <stop offset="0.42" className="lens-glow-b" />
          <stop offset="1" className="lens-glow-c" />
        </radialGradient>
      </defs>
      <rect width={c.w} height={c.h} fill={`url(#lens-sky-${c.id})`} />
      <g className="lens-bokeh" strokeWidth="1">
        {c.bokeh.map(([x, y, r]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={r} />
        ))}
      </g>
      <Lens c={c} />
      <path
        className="lens-frame"
        fill="none"
        strokeWidth={stroke}
        d={`M${x1} ${y1 + arm}V${y1}H${x1 + arm}M${x2 - arm} ${y1}H${x2}V${y1 + arm}M${x2} ${y2 - arm}V${y2}H${x2 - arm}M${x1 + arm} ${y2}H${x1}V${y2 - arm}`}
      />
      <Timeline c={c} />
    </svg>
  )
}

export function LensScene() {
  return (
    <div data-testid="hero-scene" aria-hidden="true" className="lens-scene absolute inset-0">
      <Composed c={PHONE} className="md:hidden" />
      <Composed c={WIDE} className="hidden md:block" />
    </div>
  )
}

/**
 * The camera readout over the scene: recording and exposure, as in a viewfinder. Part of the picture,
 * so hidden from assistive tech; the digits always read left to right.
 */
export function LensHud({ className }: { className?: string }) {
  return (
    <div
      data-testid="hero-hud"
      aria-hidden="true"
      className={`lens-hud pointer-events-none flex flex-col gap-2 text-[12px] leading-none font-semibold tracking-[0.04em] tabular-nums select-none lg:flex-row lg:gap-6 ${className ?? ''}`}
    >
      <span dir="ltr" lang="en" className="flex items-center gap-1.5 whitespace-nowrap">
        <i className="lens-rec size-[7px] flex-none rounded-full" />
        REC 00:00:14:08
      </span>
      <span dir="ltr" lang="en" className="whitespace-nowrap">
        f/2.8 · 1/250 · ISO 100
      </span>
    </div>
  )
}
