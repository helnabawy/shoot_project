import { getTranslations } from 'next-intl/server'
import type { User } from '@/payload-types'
import { initialsOf } from '@/modules/creators'
import { rowClass, RowContent } from '@/shared/ui/bar'
import { Bidi } from '@/shared/ui/Bidi'
import { LogoutIcon } from '@/shared/ui/icons'
import { logout } from '../actions'

/**
 * Who is signed in, as the page's heading: the initials in a large photo tile, the name as the h1, and the
 * profession (creators) with the email as one meta line. Facts, not rows: none of it is something to do.
 */
export function AccountSummary({
  user,
  personaLabel,
}: {
  user: User
  personaLabel?: string | null
  locale: string
}) {
  return (
    <header
      className="flex items-center gap-4 px-1 lg:flex-col lg:items-start"
      data-testid="account-summary"
    >
      <span
        aria-hidden="true"
        className="grid size-16 shrink-0 place-items-center rounded-[12px] bg-tile text-[20px] font-bold tracking-tight text-tile-ink"
      >
        {initialsOf(user.name ?? '')}
      </span>
      <div className="min-w-0">
        <h1 className="text-[26px] leading-tight font-bold tracking-[-0.025em] text-balance break-words text-ink sm:text-[34px] sm:tracking-[-0.03em] lg:text-[26px]">
          {user.name}
        </h1>
        {personaLabel ? <p className="mt-0.5 text-[15px] text-ink">{personaLabel}</p> : null}
        <p className="mt-0.5 text-[15px] break-all text-mute">
          <Bidi>{user.email}</Bidi>
        </p>
      </div>
    </header>
  )
}

/** Log out: the page's last row, on the ground, away from everything else (never beside the primary action). */
export async function SignOut({ locale }: { locale: string }) {
  const t = await getTranslations('nav')
  return (
    <form action={logout} className="-mx-3 border-y border-hair py-1">
      <input type="hidden" name="locale" value={locale} />
      <button
        type="submit"
        className={`${rowClass('open')} w-[calc(100%-12px)] text-start text-mute`}
        data-testid="logout"
      >
        <RowContent glyph={<LogoutIcon width={15} height={15} />} label={t('logout')} />
      </button>
    </form>
  )
}
