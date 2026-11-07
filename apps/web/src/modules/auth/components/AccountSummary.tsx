import { getTranslations } from 'next-intl/server'
import type { User } from '@/payload-types'
import { BriefBar, ResultGroup, ResultRow, rowClass, RowContent } from '@/shared/ui/bar'
import { LogoutIcon, SearchIcon, UserIcon } from '@/shared/ui/icons'
import { Bidi } from '@/shared/ui/Bidi'
import { logout } from '../actions'

export async function AccountSummary({ user, personaLabel, locale }: { user: User; personaLabel?: string | null; locale: string }) {
  const t = await getTranslations()
  return (
    <BriefBar data-testid="account-summary">
      <ResultGroup label={t('account.details')} className="pt-1">
        <ResultRow glyph={user.name.slice(0, 1).toUpperCase()} label={user.name} state="set" />
        <ResultRow glyph="@" label={<Bidi>{user.email}</Bidi>} />
        <ResultRow
          glyph={user.accountType === 'provider' ? <UserIcon width={15} height={15} /> : <SearchIcon width={15} height={15} />}
          label={t(`auth.${user.accountType}`)}
        />
        {personaLabel ? <ResultRow glyph={personaLabel.slice(0, 1)} label={personaLabel} /> : null}
      </ResultGroup>
      <form action={logout} className="border-t border-hair py-1">
        <input type="hidden" name="locale" value={locale} />
        <button type="submit" className={`${rowClass('open')} w-full text-start`} data-testid="logout">
          <RowContent glyph={<LogoutIcon width={15} height={15} />} label={t('nav.logout')} />
        </button>
      </form>
    </BriefBar>
  )
}
