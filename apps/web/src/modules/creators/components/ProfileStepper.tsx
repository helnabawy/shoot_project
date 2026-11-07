'use client'

import { joinList } from '@shoot/domain/personas'
import { type IdentityState, PROFILE_STEPS, type ProfileStatus, type ProfileStep, type ReviewField, STEP_NUMBER, type StepStanding, type StrengthItem } from '@shoot/domain/creators'
import { useLocale, useTranslations } from 'next-intl'
import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from 'react'
import { cx, GlyphTile } from '@/shared/ui/bar'
import { CheckIcon, ChevronIcon, ForwardIcon } from '@/shared/ui/icons'


type Steps = { active: ProfileStep; show: (step: ProfileStep, focus?: 'tab' | 'panel') => void }
const StepsContext = createContext<Steps>({ active: 'basics', show: () => {} })
/** The open step and a way to open another (a failed save opens the step of its first error). */
export const useProfileSteps = () => useContext(StepsContext)

const noSubscribe = () => () => {}

const stepFromHash = (hash: string): ProfileStep | null => {
  const step = hash.replace(/^#(sec|panel|step)-/, '')
  return (PROFILE_STEPS as readonly string[]).includes(step) ? (step as ProfileStep) : null
}

/**
 * CP-FR-015/016 (owner amendment, 2026-11-08): the editor as tabs. One step's panel shows at a time;
 * every panel stays in the page, so the one profile form still sends every field. The open step follows
 * the address (`#sec-identity`), so a link or a redirect can open a step. Without JavaScript every panel
 * shows, one under another, and the tabs are links to them.
 */
export function ProfileStepsProvider({ initial, children }: { initial: ProfileStep; children: ReactNode }) {
  const [active, setActive] = useState<ProfileStep>(initial)
  const show = useCallback((step: ProfileStep, focus?: 'tab' | 'panel') => {
    setActive(step)
    window.history.replaceState(null, '', `#sec-${step}`)
    // Bring the panel's top into view when the reader has scrolled past it (phones: the tabs stick above it).
    requestAnimationFrame(() => {
      const panels = document.getElementById('profile-panels')
      if (panels && panels.getBoundingClientRect().top < 0) panels.scrollIntoView({ block: 'start', behavior: 'smooth' })
      if (focus === 'tab') document.getElementById(`tab-${step}`)?.focus()
      if (focus === 'panel') document.getElementById(`panel-${step}`)?.focus({ preventScroll: true })
    })
  }, [])
  useEffect(() => {
    const read = () => {
      const step = stepFromHash(window.location.hash)
      if (step) setActive(step)
    }
    read()
    window.addEventListener('hashchange', read)
    return () => window.removeEventListener('hashchange', read)
  }, [])
  return <StepsContext.Provider value={{ active, show }}>{children}</StepsContext.Provider>
}

type Tone = 'done' | 'attention' | 'open'
export interface StepView {
  step: ProfileStep
  tone: Tone
  /** One short line: what the step needs, holds, or that it is done. */
  state: string
}

/** Turns each step's standing into its tab's tone and state line, in the page language. */
export function useStepViews({
  steps,
  identity,
  links,
  samples,
  blocked,
}: {
  steps: Record<ProfileStep, StepStanding>
  identity: Record<'emirates-id' | 'trade-license', IdentityState>
  links: number
  samples: number
  blocked: number
}): StepView[] {
  const t = useTranslations('creators.steps')
  const tf = useTranslations('creators.form')
  const locale = useLocale()
  const named = (fields: ReviewField[]) => joinList(fields.map((f) => tf(`incompleteMissing.${f}` as never)), 'and', locale)
  const recommended = (items: StrengthItem[]) => joinList(items.map((i) => t(`recommended.${i}` as never)), 'and', locale)
  return PROFILE_STEPS.map((step): StepView => {
    const { required, recommended: extra } = steps[step]
    if (step === 'identity') {
      const rejected = (['emirates-id', 'trade-license'] as const).filter((k) => identity[k] === 'rejected')
      if (rejected.length) return { step, tone: 'attention', state: t('identityRejected', { missing: named(rejected.map((k) => (k === 'emirates-id' ? 'emiratesId' : 'tradeLicense'))) }) }
      if (required.length) return { step, tone: 'attention', state: t('needs', { missing: named(required) }) }
      const verified = identity['emirates-id'] === 'verified' && identity['trade-license'] === 'verified'
      return { step, tone: 'done', state: verified ? t('identityVerified') : t('identityPending') }
    }
    if (required.length) return { step, tone: 'attention', state: t('needs', { missing: named(required) }) }
    if (step === 'calendar') return { step, tone: 'open', state: blocked ? t('calendarCount', { count: blocked }) : t('calendarFree') }
    if (extra.length) return { step, tone: 'open', state: t('add', { missing: recommended(extra) }) }
    if (step === 'links') return { step, tone: 'done', state: t('linksCount', { count: links }) }
    if (step === 'samples') return { step, tone: 'done', state: t('samplesCount', { count: samples }) }
    return { step, tone: 'done', state: t('done') }
  })
}

/**
 * The completion meter: one number, a hairline track filled in selection blue (the "set" colour: what is
 * filled in), and, while anything required is missing, the plain peach message saying what that means.
 */
export function ProfileProgress({ percent, open, status }: { percent: number; open: number; status: ProfileStatus }) {
  const t = useTranslations('creators.steps')
  const ready = open === 0 && (status === 'draft' || status === 'live-with-changes')
  return (
    <div className="mt-6 lg:mt-0" data-testid="profile-progress">
      <div className="flex items-end justify-between gap-3 px-1">
        <span id="profile-strength-label" className="group-label pb-1.5">
          {t('strength')}
        </span>
        <span className="text-[34px] font-bold leading-none tracking-[-0.03em] text-ink tabular-nums" data-testid="profile-percent">
          {t('percent', { percent })}
        </span>
      </div>
      <div
        role="progressbar"
        aria-labelledby="profile-strength-label"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={t('percent', { percent })}
        className="mx-1 mt-2.5 h-1.5 overflow-hidden rounded-full bg-ink/[0.08]"
      >
        <span className="block h-full rounded-full bg-accent transition-[width] duration-500 ease-out motion-reduce:transition-none" style={{ width: `${percent}%` }} />
      </div>
      {open ? (
        <div role="status" data-testid="profile-incomplete" className="mx-1 mt-4 rounded-[var(--radius-row)] bg-attention px-3.5 py-3 text-[14px] leading-relaxed text-on-attention">
          <p className="font-semibold">{t('incompleteTitle')}</p>
          <p className="mt-0.5">{t('incompleteBody', { count: open })}</p>
        </div>
      ) : ready ? (
        <div role="status" data-testid="profile-ready" className="mt-4 px-1 text-[14px] leading-relaxed">
          <p className="font-semibold text-ink">{t('readyTitle')}</p>
          <p className="text-mute">{t('readyBody')}</p>
        </div>
      ) : null}
    </div>
  )
}

/**
 * The steps as tabs: a sticky strip that scrolls sideways on phones, a vertical list beside the panel
 * from 1024 px. Each tab: its number (a tick once done), its name, and its state line; the open tab
 * reads like the toolbar's current page (ink at 6 %, never blue). Arrow keys move between tabs.
 */
export function StepTabs({ views }: { views: StepView[] }) {
  const t = useTranslations('creators.steps')
  const { active, show } = useProfileSteps()
  const list = useRef<HTMLDivElement>(null)
  // Roving focus only once the tabs are tabs; without JavaScript each is an ordinary link.
  const hydrated = useSyncExternalStore(noSubscribe, () => true, () => false)
  // Keep the open tab in view in the sideways strip.
  useEffect(() => {
    const tab = document.getElementById(`tab-${active}`)
    if (tab && list.current && list.current.scrollWidth > list.current.clientWidth) tab.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [active])
  const onKey = (event: KeyboardEvent) => {
    const i = PROFILE_STEPS.indexOf(active)
    const rtl = document.documentElement.dir === 'rtl'
    const move: Record<string, number> = { ArrowDown: 1, ArrowUp: -1, ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 }
    let next: number | null = event.key in move ? i + move[event.key]! : event.key === 'Home' ? 0 : event.key === 'End' ? PROFILE_STEPS.length - 1 : null
    if (next === null) return
    event.preventDefault()
    next = (next + PROFILE_STEPS.length) % PROFILE_STEPS.length
    show(PROFILE_STEPS[next]!, 'tab')
  }
  return (
    <div className="sticky top-[60px] z-10 -mx-3 mt-5 border-y border-hair bg-ground lg:static lg:mx-0 lg:mt-6 lg:border-0 lg:bg-transparent">
      <div
        ref={list}
        role="tablist"
        aria-label={t('label')}
        onKeyDown={onKey}
        className="flex snap-x gap-1 overflow-x-auto px-2 py-2 [scrollbar-width:none] lg:flex-col lg:overflow-visible lg:px-0 lg:py-0 [&::-webkit-scrollbar]:hidden"
        data-testid="profile-steps"
      >
        {views.map(({ step, tone, state }) => {
          const selected = step === active
          return (
            <a
              key={step}
              id={`tab-${step}`}
              href={`#sec-${step}`}
              role="tab"
              aria-selected={selected}
              aria-controls={`panel-${step}`}
              tabIndex={hydrated ? (selected ? 0 : -1) : undefined}
              onClick={(event) => {
                event.preventDefault()
                show(step)
              }}
              data-testid={`step-${step}`}
              data-state={tone}
              className={cx(
                'grid w-max max-w-[248px] shrink-0 snap-start grid-cols-[30px_minmax(0,1fr)] items-center gap-x-2.5 rounded-[var(--radius-row)] px-2.5 py-2 text-start transition-colors duration-100 lg:w-full',
                'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--focus)]',
                selected ? 'bg-ink/[0.06]' : 'hover:bg-ink/[0.045]',
              )}
            >
              <GlyphTile tone={tone === 'done' ? 'set' : 'ink'} className="row-span-2 text-[13px] tabular-nums">
                {tone === 'done' ? <CheckIcon width={15} height={15} /> : STEP_NUMBER[step]}
              </GlyphTile>
              <span className={cx('truncate whitespace-nowrap text-[15px] leading-tight text-ink lg:whitespace-normal', selected ? 'font-semibold' : 'font-medium')}>{t(step)}</span>
              <span
                className={cx(
                  'mt-0.5 justify-self-start truncate text-[13px] leading-tight lg:line-clamp-2 lg:whitespace-normal',
                  tone === 'attention' ? 'max-w-full rounded-[5px] bg-attention px-1 text-on-attention' : tone === 'done' ? 'text-selected-ink' : 'text-mute',
                )}
                title={state}
              >
                {state}
              </span>
            </a>
          )
        })}
      </div>
    </div>
  )
}

/**
 * One step's panel. Inactive panels are hidden only once JavaScript runs (the `.js` class is set before
 * first paint, so there is no flash); their fields stay in the form. Ends with Back and Next.
 */
export function StepPanel({ step, children }: { step: ProfileStep; children: ReactNode }) {
  const t = useTranslations('creators.steps')
  const { active, show } = useProfileSteps()
  const i = PROFILE_STEPS.indexOf(step)
  const prev = PROFILE_STEPS[i - 1]
  const next = PROFILE_STEPS[i + 1]
  const button = 'inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-row)] px-3 text-[15px] font-medium text-ink hover:bg-ink/[0.06] focus-visible:outline-2 focus-visible:outline-[var(--focus)]'
  return (
    <div
      id={`panel-${step}`}
      role="tabpanel"
      aria-labelledby={`tab-${step}`}
      tabIndex={-1}
      data-panel={step}
      className={cx('outline-none [&>section:first-child]:mt-0', step !== active && '[.js_&]:hidden')}
    >
      {children}
      <div className="mt-6 hidden items-center justify-between gap-2 border-t border-hair pt-3 [.js_&]:flex">
        {prev ? (
          <button type="button" className={button} onClick={() => show(prev, 'panel')} data-testid="step-back">
            <ChevronIcon width={16} height={16} className="rotate-180" />
            {t('back')}
          </button>
        ) : (
          <span />
        )}
        {next ? (
          <button type="button" className={cx(button, 'bg-tile font-semibold hover:bg-ink/[0.08]')} onClick={() => show(next, 'panel')} data-testid="step-next">
            {t('next', { step: t(next) })}
            <ForwardIcon width={16} height={16} />
          </button>
        ) : null}
      </div>
    </div>
  )
}

/** The page's step overview: completion meter, the message, and the tabs (one client island). */
export function ProfileOverview({
  percent,
  steps,
  status,
  ...counts
}: {
  percent: number
  steps: Record<ProfileStep, StepStanding>
  status: ProfileStatus
  identity: Record<'emirates-id' | 'trade-license', IdentityState>
  links: number
  samples: number
  blocked: number
}) {
  const views = useStepViews({ steps, ...counts })
  return (
    <>
      <ProfileProgress percent={percent} open={views.filter((v) => v.tone === 'attention').length} status={status} />
      <StepTabs views={views} />
    </>
  )
}
