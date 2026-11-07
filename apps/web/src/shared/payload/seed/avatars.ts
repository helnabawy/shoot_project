// Illustrated portraits for the demo creators: flat, original drawings rendered to images at seed
// time. Never photographs and never a real person's likeness (no invented proof, Principle IV).

export type Hair = 'short' | 'crop' | 'curly' | 'long' | 'bob' | 'bun' | 'hijab' | 'ghutra'

export interface AvatarSpec {
  /** Skin tone. */
  skin: string
  hair: Hair
  /** Hair colour, or the scarf's colour for `hijab`. */
  hairColour: string
  /** Shirt or abaya colour. */
  outfit: string
  /** Ground behind the figure. */
  ground: string
  beard?: 'full' | 'stubble'
  glasses?: boolean
}

const INK = '#2a211c'

/** Darkens (negative) or lightens (positive) a #rrggbb colour by a fraction. */
function shade(hex: string, amount: number): string {
  const n = Number.parseInt(hex.slice(1), 16)
  const channel = (shift: number) => {
    const c = (n >> shift) & 0xff
    const v = amount < 0 ? c * (1 + amount) : c + (255 - c) * amount
    return Math.round(Math.min(255, Math.max(0, v)))
      .toString(16)
      .padStart(2, '0')
  }
  return `#${channel(16)}${channel(8)}${channel(0)}`
}

const BODY = 'M 64 512 C 68 424 150 384 256 384 C 362 384 444 424 448 512 Z'

function backHair(spec: AvatarSpec): string {
  const c = spec.hairColour
  switch (spec.hair) {
    case 'long':
      return `<path d="M 158 252 C 146 150 204 112 256 112 C 312 112 368 150 354 252 C 352 300 368 360 378 420 C 330 446 182 446 134 420 C 146 360 160 300 158 252 Z" fill="${c}"/>`
    case 'bob':
      return `<path d="M 160 250 C 150 150 206 114 256 114 C 310 114 364 150 352 250 C 352 290 360 320 366 340 C 330 352 182 352 146 340 C 152 320 160 290 160 250 Z" fill="${c}"/>`
    case 'bun':
      return `<circle cx="256" cy="112" r="44" fill="${c}"/>`
    case 'hijab':
      // The scarf frames the face and falls over the shoulders.
      return `<path d="M 256 112 C 162 112 140 196 142 278 C 144 336 160 376 186 400 C 120 418 76 446 68 512 L 444 512 C 436 446 392 418 326 400 C 352 376 368 336 370 278 C 372 196 350 112 256 112 Z" fill="${c}"/>`
    case 'ghutra':
      return `<path d="M 256 104 C 160 104 136 190 136 270 C 136 350 150 410 120 512 L 392 512 C 362 410 376 350 376 270 C 376 190 352 104 256 104 Z" fill="${c}"/><path d="M 136 270 C 136 350 150 410 120 512 L 160 512 C 176 430 168 360 170 300 Z" fill="${shade(c, -0.08)}"/><path d="M 376 270 C 376 350 362 410 392 512 L 352 512 C 336 430 344 360 342 300 Z" fill="${shade(c, -0.08)}"/>`
    default:
      return ''
  }
}

function frontHair(spec: AvatarSpec): string {
  const c = spec.hairColour
  switch (spec.hair) {
    case 'short':
      return `<path d="M 170 240 C 158 156 206 122 258 122 C 314 122 356 156 342 240 C 336 204 322 182 304 172 C 268 190 222 188 194 174 C 180 188 172 210 170 240 Z" fill="${c}"/>`
    case 'crop':
      return `<path d="M 174 226 C 170 160 210 134 258 134 C 306 134 344 160 338 226 C 328 196 300 176 256 176 C 212 176 184 196 174 226 Z" fill="${c}"/>`
    case 'curly': {
      const curls = [
        [180, 200, 28],
        [200, 166, 30],
        [232, 146, 30],
        [266, 140, 30],
        [298, 150, 30],
        [326, 172, 28],
        [338, 206, 24],
        [214, 186, 22],
        [284, 178, 22],
      ]
        .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`)
        .join('')
      return curls
    }
    case 'long':
    case 'bob':
      return `<path d="M 172 236 C 172 162 214 128 260 128 C 304 128 342 160 340 230 C 308 206 272 184 240 168 C 222 196 198 220 172 236 Z" fill="${c}"/>`
    case 'bun':
      return `<path d="M 172 232 C 166 162 210 130 256 130 C 304 130 346 162 340 232 C 328 196 300 172 256 170 C 212 172 184 196 172 232 Z" fill="${c}"/>`
    case 'hijab':
      return `<path d="M 176 236 C 180 170 218 144 256 144 C 294 144 332 170 336 236 C 318 204 292 190 256 190 C 220 190 194 204 176 236 Z" fill="${c}"/><path d="M 186 330 C 206 364 230 378 256 378 C 282 378 306 364 326 330 C 330 360 300 392 256 392 C 212 392 182 360 186 330 Z" fill="${shade(c, -0.12)}"/>`
    case 'ghutra':
      return `<path d="M 176 238 C 178 166 216 138 256 138 C 296 138 334 166 336 238 C 318 200 290 186 256 186 C 222 186 194 200 176 238 Z" fill="${c}"/><path d="M 168 158 C 196 130 316 130 344 158" stroke="${INK}" stroke-width="13" fill="none" stroke-linecap="round"/><path d="M 172 178 C 200 152 312 152 340 178" stroke="${INK}" stroke-width="9" fill="none" stroke-linecap="round"/>`
    default:
      return ''
  }
}

function beard(spec: AvatarSpec): string {
  if (!spec.beard) return ''
  const c =
    spec.hairColour === '#f2efe9' ? '#3b2f28' : spec.hair === 'ghutra' ? '#2f2621' : spec.hairColour
  const opacity = spec.beard === 'stubble' ? 0.2 : 1
  return `<g opacity="${opacity}"><path d="M 174 258 C 176 330 214 360 256 360 C 298 360 336 330 338 258 C 330 296 306 314 288 318 C 276 306 236 306 224 318 C 206 314 182 296 174 258 Z" fill="${c}"/><path d="M 226 300 C 240 290 272 290 286 300 C 272 306 240 306 226 300 Z" fill="${c}"/></g>`
}

function face(spec: AvatarSpec): string {
  const skinShade = shade(spec.skin, -0.14)
  const brow =
    spec.hair === 'hijab' || spec.hair === 'ghutra' ? '#2f2621' : shade(spec.hairColour, -0.1)
  const ears =
    spec.hair === 'hijab' || spec.hair === 'ghutra' || spec.hair === 'long'
      ? ''
      : `<circle cx="172" cy="252" r="17" fill="${spec.skin}"/><circle cx="340" cy="252" r="17" fill="${spec.skin}"/>`
  const glasses = spec.glasses
    ? `<g fill="none" stroke="${INK}" stroke-width="5"><rect x="196" y="232" width="50" height="38" rx="14"/><rect x="266" y="232" width="50" height="38" rx="14"/><path d="M 246 248 Q 256 242 266 248"/></g>`
    : ''
  return [
    `<path d="M 224 300 L 224 380 Q 256 404 288 380 L 288 300 Z" fill="${skinShade}"/>`,
    ears,
    `<ellipse cx="256" cy="242" rx="84" ry="100" fill="${spec.skin}"/>`,
    `<circle cx="206" cy="284" r="14" fill="#e0786a" opacity="0.14"/><circle cx="306" cy="284" r="14" fill="#e0786a" opacity="0.14"/>`,
    `<path d="M 204 226 Q 222 214 242 222" stroke="${brow}" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M 270 222 Q 290 214 308 226" stroke="${brow}" stroke-width="7" fill="none" stroke-linecap="round"/>`,
    `<ellipse cx="222" cy="252" rx="7" ry="9" fill="${INK}"/><ellipse cx="290" cy="252" rx="7" ry="9" fill="${INK}"/>`,
    `<path d="M 256 258 Q 248 282 260 288" stroke="${skinShade}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
    `<path d="M 234 310 Q 256 326 278 310" stroke="#8a3f35" stroke-width="6" fill="none" stroke-linecap="round"/>`,
    glasses,
  ].join('')
}

/** A square portrait (512 × 512) as SVG. */
export function avatarSvg(spec: AvatarSpec): string {
  const outfitShade = shade(spec.outfit, -0.12)
  const collar =
    spec.hair === 'hijab' || spec.hair === 'ghutra'
      ? ''
      : `<path d="M 218 386 L 256 436 L 294 386 Z" fill="${outfitShade}"/>`
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">',
    `<rect width="512" height="512" fill="${spec.ground}"/>`,
    `<circle cx="256" cy="560" r="260" fill="${shade(spec.ground, -0.06)}"/>`,
    // The figure fills more of the tile: it is mostly seen at 44–64 px.
    '<g transform="translate(256 300) scale(1.14) translate(-256 -300)">',
    spec.hair === 'hijab' || spec.hair === 'ghutra'
      ? ''
      : `<path d="${BODY}" fill="${spec.outfit}"/>`,
    backHair(spec),
    spec.hair === 'hijab' || spec.hair === 'ghutra' ? '' : collar,
    face(spec),
    beard(spec),
    frontHair(spec),
    '</g>',
    '</svg>',
  ].join('')
}
