import type { SVGProps } from 'react'

// One authored icon set: 20 px grid, 1.75 stroke, round caps. No emoji, no copied platform icons.
type IconProps = SVGProps<SVGSVGElement> & { title?: string }

function Svg({ title, children, ...props }: IconProps) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  )
}

export const SearchIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="8.5" cy="8.5" r="5.5" />
    <path d="m13 13 4 4" />
  </Svg>
)
/** The Command key legend, drawn so key hints never depend on a font's ⌘ glyph. */
export const CommandIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7.5 7.5h5v5h-5z" />
    <path d="M7.5 7.5V5.75A1.75 1.75 0 1 0 5.75 7.5zM12.5 7.5h1.75a1.75 1.75 0 1 0-1.75-1.75zM12.5 12.5v1.75a1.75 1.75 0 1 0 1.75-1.75zM7.5 12.5H5.75a1.75 1.75 0 1 0 1.75 1.75z" />
  </Svg>
)
export const ReturnIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M16 4v6a2 2 0 0 1-2 2H5" />
    <path d="m8 9-3 3 3 3" />
  </Svg>
)
/** Points "forward" in the reading direction (mirrored in RTL by the rtl: variant). */
export const ForwardIcon = ({ className = '', ...p }: IconProps) => (
  <Svg className={`rtl:-scale-x-100 ${className}`} {...p}>
    <path d="M4 10h12" />
    <path d="m11 5 5 5-5 5" />
  </Svg>
)
export const ChevronIcon = ({ className = '', ...p }: IconProps) => (
  <Svg className={`rtl:-scale-x-100 ${className}`} {...p}>
    <path d="m8 5 5 5-5 5" />
  </Svg>
)
/** Vertical disclosure: points down in both directions, so it is never mirrored. */
export const ChevronDownIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m5 8 5 5 5-5" />
  </Svg>
)
export const LogoutIcon = ({ className = '', ...p }: IconProps) => (
  <Svg className={`rtl:-scale-x-100 ${className}`} {...p}>
    <path d="M8 4H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
    <path d="M12 6.5 15.5 10 12 13.5" />
    <path d="M15.5 10H8" />
  </Svg>
)
export const CheckIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m4.5 10.5 3.5 3.5 7.5-8" />
  </Svg>
)
export const MenuIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 6.5h13M3.5 13.5h13" />
  </Svg>
)
export const CloseIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m5 5 10 10M15 5 5 15" />
  </Svg>
)
export const SunIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="10" cy="10" r="3.25" />
    <path d="M10 2.5v1.5M10 16v1.5M2.5 10H4M16 10h1.5M4.7 4.7l1 1M14.3 14.3l1 1M4.7 15.3l1-1M14.3 5.7l1-1" />
  </Svg>
)
export const MoonIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M16 12.5A6.5 6.5 0 0 1 7.5 4a6.5 6.5 0 1 0 8.5 8.5Z" />
  </Svg>
)
export const DeviceIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="4" width="14" height="10" rx="1.75" />
    <path d="M7.5 17h5M10 14v3" />
  </Svg>
)
export const CalendarIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="4.5" width="14" height="12.5" rx="2" />
    <path d="M3 8.5h14M7 2.5v3M13 2.5v3" />
  </Svg>
)
/** WhatsApp mark drawn as a speech bubble with a handset; filled for legibility at small sizes. */
export const WhatsAppIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10 2.75a7.25 7.25 0 0 0-6.27 10.9L2.75 17.25l3.7-.96A7.25 7.25 0 1 0 10 2.75Z" />
    <path
      d="M7.4 7.1c.15-.35.4-.36.6-.36h.38c.13 0 .3.04.45.36l.55 1.3c.06.15.1.31-.03.5l-.4.5c-.1.12-.15.27-.05.44.32.56 1.05 1.43 2.04 1.9.18.09.33.06.45-.07l.5-.6c.13-.16.3-.14.46-.07l1.27.6c.17.08.3.15.33.25.04.13 0 .73-.33 1.08-.33.35-1.03.66-1.64.6-1.86-.16-3.86-1.92-4.62-3.36-.5-.94-.33-1.96-.06-2.4Z"
      fill="currentColor"
      stroke="none"
    />
  </Svg>
)
export const UserIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="10" cy="7" r="3.25" />
    <path d="M3.75 17a6.25 6.25 0 0 1 12.5 0" />
  </Svg>
)
export const PhoneIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6.2 3.25H4.5A1.25 1.25 0 0 0 3.25 4.6 13 13 0 0 0 15.4 16.75a1.25 1.25 0 0 0 1.35-1.25v-1.7a1 1 0 0 0-.75-.97l-2.4-.6a1 1 0 0 0-1 .3l-.8.85a10 10 0 0 1-4.45-4.45l.85-.8a1 1 0 0 0 .3-1l-.6-2.4a1 1 0 0 0-.97-.75Z" />
  </Svg>
)
export const TagIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.25 3.25h6.2l7.3 7.3a1.25 1.25 0 0 1 0 1.77l-4.43 4.43a1.25 1.25 0 0 1-1.77 0l-7.3-7.3Z" />
    <circle cx="6.75" cy="6.75" r="1" />
  </Svg>
)
export const PinIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10 17.25s5.5-4.9 5.5-9.1a5.5 5.5 0 0 0-11 0c0 4.2 5.5 9.1 5.5 9.1Z" />
    <circle cx="10" cy="8" r="1.9" />
  </Svg>
)
export const GlobeIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="10" cy="10" r="7" />
    <path d="M3 10h14" />
    <path d="M10 3c2 2 3 4.4 3 7s-1 5-3 7c-2-2-3-4.4-3-7s1-5 3-7Z" />
  </Svg>
)
/** A play mark for video samples: drawn, never a font glyph. */
export const PlayIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 4.75v10.5L15.25 10Z" fill="currentColor" />
  </Svg>
)
export const PlusIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10 4.5v11M4.5 10h11" />
  </Svg>
)
export const MinusIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 10h11" />
  </Svg>
)
export const AlertIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10 3.5 17 16H3l7-12.5Z" />
    <path d="M10 8.5v3.25M10 14h.01" />
  </Svg>
)
export const BellIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5.5 13.5V9a4.5 4.5 0 0 1 9 0v4.5l1.25 1.5H4.25l1.25-1.5Z" />
    <path d="M8.5 17h3" />
  </Svg>
)
export const DocumentIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 2.75h5.5L15 6.25v11H6a1 1 0 0 1-1-1V3.75a1 1 0 0 1 1-1Z" />
    <path d="M11.25 2.75v3.75H15M7.75 10.5h4.5M7.75 13.5h4.5" />
  </Svg>
)
export const HelpIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="10" cy="10" r="7" />
    <path d="M8 8a2 2 0 1 1 2.75 1.85c-.45.2-.75.6-.75 1.1v.3M10 13.75h.01" />
  </Svg>
)
export const PauseIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7.25 5v10M12.75 5v10" />
  </Svg>
)
export const FlagIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 17.25V3.5" />
    <path d="M5 4h9.5l-1.75 3.5L14.5 11H5" />
  </Svg>
)
export const ClockIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="10" cy="10" r="7" />
    <path d="M10 6.25V10l2.5 1.75" />
  </Svg>
)
/** A padlock: marks something only the owner and the team can see (identity documents). */
export const LockIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4.5" y="9" width="11" height="8" rx="1.75" />
    <path d="M7 9V6.5a3 3 0 0 1 6 0V9M10 12.25v1.5" />
  </Svg>
)
export const ImageIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="4" width="14" height="12" rx="2" />
    <circle cx="7.5" cy="8.25" r="1.25" />
    <path d="m3.5 14.5 4-4 3 3 2-2 4 4" />
  </Svg>
)
