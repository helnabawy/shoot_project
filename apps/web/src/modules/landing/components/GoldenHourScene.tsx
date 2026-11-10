/** Dust in the low sun: position and size; each drifts up on its own phase (globals.css, `.scene-dust`). */
const MOTES: { x: number; y: number; r: number }[] = [
  { x: 240, y: 620, r: 2.4 },
  { x: 520, y: 560, r: 2 },
  { x: 700, y: 660, r: 2.6 },
  { x: 900, y: 600, r: 2 },
  { x: 1100, y: 680, r: 2.4 },
  { x: 120, y: 520, r: 2 },
]

/** A low skyline in one path, repeated three times along the horizon. */
const SKYLINE =
  'M0 400v-28h14v-18h10v18h12v-34h8v-14h6v14h8v34h16v-22h12v22h10v-52l5-22 5 22v52h14v-28h12v28h18v-16h14v16h20v-40h10v40h12v-24h16v24h14v-60h4v-16h4v16h4v60h18v-20h14v20h20v-32h12v32h18v40H0z'

/**
 * The golden-hour scene behind the hero bar until the CMS has a photo (design 41 · Landing · 1440):
 * a warm sky, the low sun as the key light, a city on the horizon and dunes in front of it, with one
 * small figure at work on the near dune. Shapes only, in the `--scene-*` tokens, so it reads as light
 * and place, never as proof of work.
 *
 * Motion lives in globals.css ("Golden hour"): from 1024 px the key light breathes, its rays sway, the
 * dunes drift and dust rises, all under the page's one Pause control. Phones keep the still scene so
 * the glass bar is not re-blurred every frame, and reduced motion stills it everywhere. The sun sits
 * toward the end side, so the scene mirrors in Arabic. Decorative: `aria-hidden`.
 */
export function GoldenHourScene() {
  return (
    <svg
      data-testid="hero-scene"
      aria-hidden="true"
      focusable="false"
      className="golden-hour absolute inset-0 size-full rtl:-scale-x-100"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMax slice"
    >
      <defs>
        <linearGradient id="golden-hour-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="scene-stop-top" />
          <stop offset="0.6" className="scene-stop-mid" />
          <stop offset="1" className="scene-stop-low" />
        </linearGradient>
        <radialGradient id="golden-hour-sun">
          <stop offset="0" className="scene-stop-light" />
          <stop offset="0.42" className="scene-stop-halo" />
          <stop offset="1" className="scene-stop-fade" />
        </radialGradient>
      </defs>
      <rect width="1440" height="900" fill="url(#golden-hour-sky)" />
      <g className="scene-rays">
        <path d="M820 560 300 900h260z" />
        <path d="M820 560 0 700v120z" />
        <path d="M820 560 1000 900h160z" />
      </g>
      <g className="scene-sun">
        <circle cx="820" cy="560" r="250" fill="url(#golden-hour-sun)" />
        <circle cx="820" cy="560" r="52" className="scene-disc" />
      </g>
      <g className="scene-skyline">
        <path transform="translate(60 40) scale(1.5)" d={SKYLINE} />
        <path transform="translate(600 40) scale(1.5)" d={SKYLINE} />
        <path transform="translate(1140 40) scale(1.5)" d={SKYLINE} />
      </g>
      <path className="scene-dune-far" d="M-40 660C240 610 480 620 720 650s480-20 760-60v310H-40z" />
      <g className="scene-dune-mid">
        <path d="M-40 730C280 680 600 700 840 740s440-10 640-40v200H-40z" />
        <g className="scene-figure" transform="translate(766 729) scale(1.7) translate(-98 -453)" strokeWidth="1.6" strokeLinecap="round">
          <circle cx="98" cy="426" r="4" />
          <path d="M94 453v-17a4 4 0 0 1 8 0v17z" />
          <path className="scene-figure-line" d="M113 437l-5 16m5-16v16m0-16 5 16" />
          <rect x="108.5" y="430" width="9" height="6.5" rx="1.5" />
        </g>
      </g>
      <path className="scene-dune-near" d="M0 830c320-50 680-30 960 10 200 26 360 4 480-20v80H0z" />
      <g className="scene-dust">
        {MOTES.map((m) => (
          <circle key={`${m.x}-${m.y}`} cx={m.x} cy={m.y} r={m.r} />
        ))}
      </g>
    </svg>
  )
}
