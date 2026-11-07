'use client'

import { useTheme } from 'next-themes'
import { useHydrated } from '@/shared/ui/useHydrated'
import { DeviceIcon, MoonIcon, SunIcon } from '@/shared/ui/icons'
import { cx } from '@/shared/ui/bar'

export interface ThemeLabels {
  label: string
  light: string
  dark: string
  system: string
}

const OPTIONS = [
  { value: 'light', Icon: SunIcon },
  { value: 'dark', Icon: MoonIcon },
  { value: 'system', Icon: DeviceIcon },
] as const

/**
 * Light / dark / system (FR-042), as a macOS segmented control: the chosen segment is a raised
 * panel chip on a quiet track. Hidden without JavaScript, when the device setting applies.
 */
export function ThemeToggle({ labels, className }: { labels: ThemeLabels; className?: string }) {
  const { theme, setTheme } = useTheme()
  const mounted = useHydrated()

  return (
    <div
      role="group"
      aria-label={labels.label}
      data-testid="theme-toggle"
      className={cx(
        'js-only gap-0.5 rounded-[9px] bg-ink/[0.06] p-0.5',
        className ?? 'inline-flex',
      )}
    >
      {OPTIONS.map(({ value, Icon }) => {
        const active = mounted && (theme ?? 'system') === value
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            aria-label={labels[value]}
            title={labels[value]}
            onClick={() => setTheme(value)}
            className={cx(
              'grid size-8 place-items-center rounded-[7px] transition-colors',
              active
                ? 'bg-panel-solid text-ink ring-1 ring-hair'
                : 'text-mute hover:bg-ink/[0.05] hover:text-ink',
            )}
          >
            <Icon width={16} height={16} />
          </button>
        )
      })}
    </div>
  )
}
