import type { CSSProperties } from 'react'

/** Dust in the beam: position, size, drift period and phase (negative delay = already drifting). */
const MOTES: { x: number; y: number; r: number; t: number; d: number }[] = [
  { x: 330, y: -30, r: 2.4, t: 17, d: -2 },
  { x: 410, y: 80, r: 1.6, t: 21, d: -9 },
  { x: 470, y: -90, r: 2, t: 19, d: -14 },
  { x: 560, y: 40, r: 2.8, t: 23, d: -5 },
  { x: 640, y: -30, r: 1.8, t: 18, d: -11 },
  { x: 720, y: 120, r: 2.2, t: 25, d: -17 },
  { x: 520, y: 180, r: 1.5, t: 20, d: -7 },
  { x: 390, y: 150, r: 2, t: 22, d: -13 },
]

/**
 * The empty set behind the hero bar, drawn over the studio sweep until the CMS has a hero photo:
 * a softbox lighting the paper from the start side and a camera on its tripod facing it from the
 * end side. "You brief. We shoot." as a picture: everything is ready, only the brief is missing.
 *
 * Silhouettes only, at the theme's set opacities, so it reads as atmosphere behind the glass bar,
 * never as proof of work. Both rigs anchor with logical insets and mirror in Arabic so the light
 * always faces the camera across the bar.
 *
 * Motion (globals.css, "Set Motion" in DESIGN.md), CSS only and still under reduced motion: the rigs
 * glide in from their sides and the modelling lamp strikes on; then, on one 8 s loop, the light
 * breathes and fires a flash with a bloom. From 1024 px a beam falls from the softbox across the
 * stage with dust drifting in it and the camera pans slowly; phones keep the still beam-less set so
 * the glass bar is not re-blurred every frame. Decorative: the stage that holds it is `aria-hidden`.
 */
export function StudioSet() {
  return (
    <div className="studio-set pointer-events-none absolute inset-0">
      {/* The key light: speed ring at the origin, the face toward the end side, its stand to the floor. */}
      <svg
        viewBox="-100 -160 360 800"
        className="studio-set-rig studio-set-rig-light absolute top-[4%] start-[-44px] h-[56%] w-auto aspect-[360/800] overflow-visible rtl:-scale-x-100 lg:top-auto lg:bottom-0 lg:start-[max(-60px,calc(50%-700px))] lg:h-[min(92%,820px)]"
        focusable="false"
      >
        <defs>
          {/* Brightest at the face (the focal point) and falling off softly in every direction. */}
          <radialGradient id="studio-set-beam" cx="0.5" cy="0.5" r="0.5" fx="0.06" fy="0.5">
            <stop offset="0" style={{ stopColor: 'var(--set-glow)', stopOpacity: 1 }} />
            <stop offset="0.45" style={{ stopColor: 'var(--set-glow)', stopOpacity: 0.4 }} />
            <stop offset="1" style={{ stopColor: 'var(--set-glow)', stopOpacity: 0 }} />
          </radialGradient>
          <radialGradient id="studio-set-bloom">
            <stop offset="0" style={{ stopColor: 'var(--set-glow)', stopOpacity: 1 }} />
            <stop offset="1" style={{ stopColor: 'var(--set-glow)', stopOpacity: 0 }} />
          </radialGradient>
        </defs>

        {/* The air in front of the light: a beam across the stage and the dust that shows it. */}
        <g className="max-lg:hidden">
          <ellipse
            className="studio-set-beam"
            cx="640"
            cy="20"
            rx="420"
            ry="340"
            fill="url(#studio-set-beam)"
          />
          <g className="studio-set-dust">
            {MOTES.map((m) => (
              <circle
                key={`${m.x}-${m.y}`}
                className="studio-set-mote"
                cx={m.x}
                cy={m.y}
                r={m.r}
                style={{ '--mote-t': `${m.t}s`, '--mote-d': `${m.d}s` } as CSSProperties}
              />
            ))}
          </g>
        </g>

        <g className="studio-set-ink">
          <path d="M0 -22 L70 -150 L70 150 L0 22 Z" />
          <rect x="-14" y="-20" width="14" height="40" rx="3" />
          <rect x="-11" y="18" width="8" height="30" rx="2" />
          <rect x="-11" y="46" width="8" height="500" rx="4" />
          <circle cx="-7" cy="300" r="9" />
          <path
            d="M-7 520 L-96 638 M-7 520 L-4 640 M-7 520 L80 636"
            fill="none"
            strokeWidth="7"
            strokeLinecap="round"
          />
        </g>
        <g className="studio-set-glow">
          <path d="M70 -150 L250 -126 L250 126 L70 150 Z" />
        </g>
        <g className="studio-set-ink">
          <path d="M84 -134 L236 -114 L236 114 L84 134 Z" fill="none" strokeWidth="2" />
        </g>
        {/* The flash's bloom: invisible until the light fires once per loop. */}
        <ellipse
          className="studio-set-flash"
          cx="170"
          cy="0"
          rx="260"
          ry="300"
          fill="url(#studio-set-bloom)"
        />
      </svg>

      {/* The camera: tripod head at the origin, the lens toward the start side, legs to the floor. */}
      <svg
        viewBox="-140 -130 260 475"
        className="studio-set-rig studio-set-rig-camera absolute bottom-0 end-[-28px] h-[25%] w-auto aspect-[260/475] overflow-visible rtl:-scale-x-100 lg:end-[max(-30px,calc(50%-690px))] lg:h-[48%] xl:h-[62%]"
        focusable="false"
      >
        {/* The head pans on the tripod; the invisible square centres its box on the pivot (0, -8). */}
        <g className="studio-set-head">
          <rect x="-150" y="-158" width="300" height="300" fill="none" />
          <g className="studio-set-ink">
            <rect x="-60" y="-86" width="110" height="70" rx="8" />
            <rect x="-118" y="-74" width="62" height="46" rx="6" />
            <rect x="-130" y="-79" width="14" height="56" rx="4" />
            <rect x="54" y="-80" width="36" height="28" rx="3" />
            <path d="M-40 -86 V-104 H32 V-86" fill="none" strokeWidth="7" strokeLinejoin="round" />
            <rect x="-34" y="-122" width="54" height="13" rx="6.5" />
            <rect x="-32" y="-16" width="64" height="16" rx="3" />
            <path d="M30 -8 L112 30" fill="none" strokeWidth="7" strokeLinecap="round" />
          </g>
          {/* The tally light: the camera is rolling. */}
          <circle className="studio-set-tally" cx="-46" cy="-72" r="5" />
        </g>
        <g className="studio-set-ink">
          <rect x="-6" y="0" width="12" height="96" rx="3" />
          <path
            d="M0 8 L-96 334 M0 8 L4 342 M0 8 L100 334"
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
          />
        </g>
      </svg>
    </div>
  )
}
