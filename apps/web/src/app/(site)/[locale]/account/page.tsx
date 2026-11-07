import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { AccountSummary } from '@/modules/auth/components/AccountSummary'
import { requireUser } from '@/modules/auth/session'
import { MyBriefs } from '@/modules/brief/components/MyBriefs'
import { getMyBriefs } from '@/modules/brief/queries'
import { getAllPersonas } from '@/modules/personas/queries'
import type { Locale } from '@/shared/lib/locale'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'account' })
  return { title: t('title'), robots: { index: false } }
}

export default async function AccountPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const user = await requireUser(locale as Locale, '/account')
  const [t, briefs, personas] = await Promise.all([getTranslations('account'), getMyBriefs(user), getAllPersonas(locale as Locale)])
  const personaId = user.persona ? String(typeof user.persona === 'object' ? user.persona.id : user.persona) : null
  const persona = personas.find((p) => p.id === personaId)
  return (
    <section className="mx-auto max-w-[560px] px-3 pt-8 sm:pt-14">
      <h1 className="mb-5 px-1 text-[34px] font-bold leading-tight tracking-[-0.03em] text-ink">{t('title')}</h1>
      <AccountSummary user={user} personaLabel={persona?.singular} locale={locale} />
      <MyBriefs briefs={briefs} locale={locale} />
    </section>
  )
}
