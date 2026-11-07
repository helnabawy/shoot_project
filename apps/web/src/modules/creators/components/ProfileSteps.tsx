import { joinList } from '@shoot/domain/personas'
import type { ProfileStatus, ReviewField } from '@shoot/domain/creators'
import { useLocale, useTranslations } from 'next-intl'
import { cx, RowContent, rowClass, type RowState } from '@/shared/ui/bar'
import { CheckIcon } from '@/shared/ui/icons'
import type { MyIdentity } from '../my-profile'

type StepKey = 'basics' | 'about' | 'places' | 'samples' | 'links' | 'calendar' | 'identity'

/** The editor's sections in page order; a required step lists the review fields it holds. */
const STEPS: { key: StepKey; fields: ReviewField[] }[] = [
  { key: 'basics', fields: ['displayName'] },
  { key: 'about', fields: ['gender'] },
  { key: 'places', fields: ['personas', 'specialties', 'cities', 'languages'] },
  { key: 'links', fields: [] },
  { key: 'samples', fields: [] },
  { key: 'calendar', fields: [] },
  { key: 'identity', fields: ['emiratesId', 'tradeLicense'] },
]

/** The step number of each section, for its heading. */
export const STEP_NUMBER = Object.fromEntries(STEPS.map((s, i) => [s.key, i + 1])) as Record<StepKey, number>

/**
 * CP-FR-015 (owner amendment, 2026-11-08): the profile as a list of steps, each a row that jumps to its
 * section and says in its trailing slot what it still needs, what is there, or that it is done. When
 * anything required is missing, a peach message above says plainly that the profile is not complete and
 * why that matters; a complete draft is told how to send it. No percentages and no progress ring.
 */
export function ProfileSteps({
  missing,
  status,
  samples,
  links,
  blocked,
  identity,
}: {
  missing: ReviewField[]
  status: ProfileStatus
  samples: number
  links: number
  blocked: number
  identity: MyIdentity
}) {
  const t = useTranslations('creators.steps')
  const tf = useTranslations('creators.form')
  const locale = useLocale()
  const gone = new Set(missing)
  const needs = (fields: ReviewField[]) => fields.filter((f) => gone.has(f))
  const named = (fields: ReviewField[]) => joinList(fields.map((f) => tf(`incompleteMissing.${f}` as never)), 'and', locale)
  const open = STEPS.filter((s) => needs(s.fields).length).length
  const ready = open === 0 && (status === 'draft' || status === 'live-with-changes')

  const row = (key: StepKey, fields: ReviewField[]): { state: RowState; done: boolean; trailing: string } => {
    const left = needs(fields)
    if (key === 'identity') {
      const rejected = (['emirates-id', 'trade-license'] as const).filter((k) => identity[k].state === 'rejected')
      if (rejected.length) return { state: 'attention', done: false, trailing: t('identityRejected', { missing: named(rejected.map((k) => (k === 'emirates-id' ? 'emiratesId' : 'tradeLicense'))) }) }
      if (left.length) return { state: 'attention', done: false, trailing: t('needs', { missing: named(left) }) }
      const verified = identity['emirates-id'].state === 'verified' && identity['trade-license'].state === 'verified'
      return { state: 'open', done: true, trailing: verified ? t('identityVerified') : t('identityPending') }
    }
    if (left.length) return { state: 'attention', done: false, trailing: t('needs', { missing: named(left) }) }
    if (key === 'samples') return { state: 'open', done: samples > 0, trailing: samples ? t('samplesCount', { count: samples }) : t('optional') }
    if (key === 'links') return { state: 'open', done: links > 0, trailing: links ? t('linksCount', { count: links }) : t('optional') }
    if (key === 'calendar') return { state: 'open', done: blocked > 0, trailing: blocked ? t('calendarCount', { count: blocked }) : t('optional') }
    return { state: 'open', done: true, trailing: t('done') }
  }

  return (
    <div className="mt-8" data-testid="profile-steps">
      {open ? (
        <div role="status" data-testid="profile-incomplete" className="mx-1 rounded-[var(--radius-row)] bg-attention px-4 py-3 text-[15px] leading-relaxed text-on-attention">
          <p className="font-semibold">{t('incompleteTitle')}</p>
          <p className="mt-0.5">{t('incompleteBody', { count: open })}</p>
        </div>
      ) : ready ? (
        <div role="status" data-testid="profile-ready" className="px-1 text-[15px] leading-relaxed">
          <p className="font-semibold text-ink">{t('readyTitle')}</p>
          <p className="text-mute">{t('readyBody')}</p>
        </div>
      ) : null}
      <nav aria-labelledby="profile-steps-label" className="mt-4">
        <span id="profile-steps-label" className="group-label block px-1 pb-1">
          {t('label')}
        </span>
        <ol className="-mx-3 divide-y divide-hair border-y border-hair py-1">
          {STEPS.map((step, i) => {
            const { state, done, trailing } = row(step.key, step.fields)
            return (
              <li key={step.key} className="py-0.5">
                <a href={`#sec-${step.key}`} className={cx(rowClass(state), 'w-[calc(100%-12px)]')} data-testid={`step-${step.key}`} data-state={state}>
                  <RowContent
                    state={state}
                    tile={done ? 'set' : 'ink'}
                    glyph={done ? <CheckIcon width={15} height={15} /> : <span className="text-[13px] tabular-nums">{i + 1}</span>}
                    label={
                      <>
                        <span className="sr-only">{t('stepOf', { n: i + 1 })}: </span>
                        {t(step.key)}
                      </>
                    }
                    trailing={trailing}
                  />
                </a>
              </li>
            )
          })}
        </ol>
      </nav>
    </div>
  )
}
