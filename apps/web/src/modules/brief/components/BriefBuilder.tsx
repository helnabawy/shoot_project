'use client'

import { formatBriefDate } from '@shoot/domain/brief/message'
import { optionsForSlot } from '@shoot/domain/brief/options'
import { omitTokens, parseSentence } from '@shoot/domain/brief/sentence'
import { joinMultiValue, splitMultiValue, todayInZone, validateBrief } from '@shoot/domain/brief/validate'
import {
  useActionState,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { useHydrated } from '@/shared/ui/useHydrated'
import {
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  CommandIcon,
  WhatsAppIcon,
} from '@/shared/ui/icons'
import {
  BarField,
  BriefBar,
  cx,
  GlyphTile,
  KeyHint,
  ResultGroup,
  RowContent,
  rowClass,
  TopHit,
} from '@/shared/ui/bar'
import { submitBrief } from '../actions'
import { chosenPersonas, CUSTOM_SUFFIX, CUSTOM_VALUE, readSlotValues, sentenceLabelFor, slotRules } from '../submit'
import type { BriefBuilderConfig, BriefState, BuilderOption, BuilderSlot } from '../types'
import { fill, type BriefLabels } from '../labels'
import { BriefSuccess } from './BriefSuccess'

const COLLAPSED_ROWS = 3

/** A group to bring into view once the options drawer has opened. */
type Reveal = { token: string; wait: boolean; showAll: boolean }

export interface BriefBuilderProps {
  config: BriefBuilderConfig
  whatsappHref: string
  providerHref: string
  /** Label for the provider action, e.g. "I'm a photographer" (already interpolated). */
  providerLabel?: string
  sourcePath: string
  labels: BriefLabels
  /** `glass` when the bar floats over the hero image. */
  tone?: 'default' | 'glass'
}

function initialValues(config: BriefBuilderConfig): Record<string, string> {
  return Object.fromEntries(
    config.slots.map((s) => [s.token, s.kind === 'date' ? '' : s.defaultValue]),
  )
}

function visibleOptions(slot: BuilderSlot, personas: readonly string[]): BuilderOption[] {
  if (slot.kind === 'persona') return slot.options
  const allowed = new Set(
    optionsForSlot(
      slot.options.map((o, i) => ({
        value: o.value,
        label: o.label,
        order: i,
        active: true,
        personas: o.personas,
      })),
      personas,
    ).map((o) => o.value),
  )
  return slot.options.filter((o) => allowed.has(o.value))
}

const normalise = (s: string) =>
  s
    .toLocaleLowerCase()
    .normalize('NFKD')
    .replace(/[ً-ٰٟ]/g, '')

export function BriefBuilder({
  config,
  whatsappHref,
  providerHref,
  providerLabel,
  sourcePath,
  labels,
  tone = 'default',
}: BriefBuilderProps) {
  const errorText = (key: string) =>
    labels.errors[key] ?? labels.errors['brief.errors.generic'] ?? key
  const uid = useId()
  const [state, formAction, pending] = useActionState<BriefState, FormData>(submitBrief, {
    status: 'idle',
  })
  const [values, setValues] = useState<Record<string, string>>(() => initialValues(config))
  const [custom, setCustom] = useState<Record<string, string>>({})
  const [query, setQuery] = useState('')
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({})
  const [dismissed, setDismissed] = useState(false)
  const popup = useRef<Window | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  // The options start folded away under the sentence; the sentence parts, the toggle and
  // Cmd/Ctrl+K open them. Without JavaScript the CSS keeps them open (html:not(.js)).
  const [expanded, setExpanded] = useState(false)
  const [reveal, setReveal] = useState<Reveal | null>(null)
  const drawerRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const filterRef = useRef<HTMLInputElement>(null)
  const drawerId = `${uid}-options`

  const hydrated = useHydrated()

  // A new answer from the server shows its errors again, even after the visitor dismissed old ones.
  const [seenState, setSeenState] = useState(state)
  if (state !== seenState) {
    setSeenState(state)
    setDismissed(false)
    // The server's problems are marked inside the groups, so open them.
    if (state.status === 'error' && Object.keys(state.errors).length > 0) setExpanded(true)
  }

  // One professional type, or several when the slot allows it (FR-063).
  const personas = chosenPersonas(config, values)
  const isChosen = (slot: BuilderSlot, value: string) => {
    const current = values[slot.token] ?? ''
    return slot.multiple ? splitMultiValue(current).includes(value) : current === value
  }

  // After the server answers: send the pre-opened tab to WhatsApp, or close it on failure.
  useEffect(() => {
    if (state.status === 'ok') {
      if (popup.current && !popup.current.closed) popup.current.location.href = state.whatsappUrl
    } else if (state.status === 'error') {
      popup.current?.close()
    }
    popup.current = null
  }, [state])

  const success = state.status === 'ok' && !dismissed

  // Once the drawer has finished opening (so the page is tall enough), scroll the group to the
  // top of the view, show all of its values and put focus on its current choice.
  useEffect(() => {
    if (!reveal) return
    const drawer = drawerRef.current
    let finished = false
    const go = () => {
      if (finished) return
      finished = true
      const group = document.getElementById(`${uid}-group-${reveal.token}`)
      if (group) {
        const more = document.getElementById(`${uid}-group-${reveal.token}-more`)
        if (reveal.showAll && more instanceof HTMLInputElement) more.checked = true
        group.scrollIntoView?.({ block: 'start' })
        const target =
          group.querySelector<HTMLInputElement>('input[type="radio"]:checked, input[data-row]:checked') ??
          group.querySelector<HTMLInputElement>('input[data-row], input:not([type="checkbox"]):not([type="hidden"])')
        target?.focus({ preventScroll: true })
      }
      setReveal(null)
    }
    const duration = drawer ? Number.parseFloat(getComputedStyle(drawer).transitionDuration) : 0
    if (!reveal.wait || !drawer || !duration) {
      const frame = requestAnimationFrame(go)
      return () => cancelAnimationFrame(frame)
    }
    const onEnd = (event: TransitionEvent) => {
      if (event.target === drawer && event.propertyName === 'grid-template-rows') go()
    }
    drawer.addEventListener('transitionend', onEnd)
    const timer = window.setTimeout(go, 500)
    return () => {
      drawer.removeEventListener('transitionend', onEnd)
      window.clearTimeout(timer)
    }
  }, [reveal, uid])

  // Cmd+K (Ctrl+K elsewhere) folds and unfolds the options from anywhere on the page. The
  // physical key is matched, so it works on an Arabic keyboard layout too.
  useEffect(() => {
    if (success) return
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (
        event.code !== 'KeyK' ||
        !(event.metaKey || event.ctrlKey) ||
        event.altKey ||
        event.shiftKey ||
        event.repeat
      )
        return
      event.preventDefault()
      toggleOptions(true)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  /** Opens the options and brings one group into view with its values. */
  function revealGroup(token: string, showAll = true) {
    setReveal({ token, wait: !expanded, showAll })
    setExpanded(true)
  }

  function collapse() {
    // Hand focus to the toggle first, or it would fall back to the page when the drawer hides.
    if (drawerRef.current?.contains(document.activeElement)) toggleRef.current?.focus()
    setExpanded(false)
    setQuery('')
  }

  function toggleOptions(fromShortcut = false) {
    if (expanded) return collapse()
    setExpanded(true)
    if (fromShortcut) {
      formRef.current?.scrollIntoView?.({ block: 'nearest' })
      filterRef.current?.focus({ preventScroll: true })
    }
  }

  const errors =
    state.status === 'error' && !dismissed ? { ...state.errors, ...clientErrors } : clientErrors
  const formError = state.status === 'error' && !dismissed ? state.formError : undefined

  const labelFor = (slot: BuilderSlot): { text: string; set: boolean } => {
    const value = values[slot.token] ?? ''
    if (value === CUSTOM_VALUE)
      return { text: custom[slot.token] || slot.placeholder, set: Boolean(custom[slot.token]) }
    if (!value) return { text: slot.placeholder || labels.chooseOne, set: false }
    if (slot.kind === 'date') return { text: formatBriefDate(value, config.locale), set: true }
    if (slot.kind === 'number') return { text: value, set: true }
    return { text: sentenceLabelFor(slot, value, config.locale), set: true }
  }

  function select(slot: BuilderSlot, value: string) {
    setValues((current) => {
      const next = { ...current, [slot.token]: value }
      if (slot.kind === 'persona') {
        // Changing the professional type drops choices it does not offer (FR-048).
        const chosen = chosenPersonas(config, next)
        for (const other of config.slots) {
          if (other.kind !== 'options') continue
          const allowed = visibleOptions(other, chosen).map((o) => o.value)
          if (
            next[other.token] &&
            next[other.token] !== CUSTOM_VALUE &&
            !allowed.includes(next[other.token] as string)
          ) {
            next[other.token] = allowed.includes(other.defaultValue) ? other.defaultValue : ''
          }
        }
      }
      return next
    })
    setClientErrors(({ [slot.token]: _removed, ...rest }) => rest)
    setDismissed(true)
    setQuery('')
  }

  /** Ticks or unticks one value of a slot that takes several (FR-063). */
  function toggle(slot: BuilderSlot, value: string) {
    const current = splitMultiValue(values[slot.token] ?? '')
    select(slot, joinMultiValue(current.includes(value) ? current.filter((v) => v !== value) : [...current, value]))
  }

  function chooseCustom(slot: BuilderSlot, text: string) {
    setCustom((c) => ({ ...c, [slot.token]: text }))
    select(slot, CUSTOM_VALUE)
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const data = new FormData(event.currentTarget)
    const { values: resolved, custom: typed } = readSlotValues(config, data)
    const found = validateBrief(slotRules(config, resolved, typed), resolved, {
      today: todayInZone(),
    })
    const first = Object.keys(found)[0]
    if (first) {
      event.preventDefault()
      setClientErrors(found)
      revealGroup(first, false)
      return
    }
    setClientErrors({})
    setDismissed(false)
    // Opened inside the tap so browsers allow it; pointed at WhatsApp once the brief is saved.
    popup.current = window.open('', '_blank')
  }

  const matches = (o: BuilderOption) => !query || normalise(o.label).includes(normalise(query))
  const allParts = useMemo(
    () =>
      parseSentence(
        config.sentence,
        config.slots.map((s) => s.token),
      ),
    [config],
  )
  // An optional part the visitor has not set is left out of the sentence; its row invites them instead.
  const parts = omitTokens(allParts, (name) => {
    const slot = config.slots.find((s) => s.token === name)
    return Boolean(slot && !slot.required && !values[name])
  })

  if (success) {
    return (
      <BriefSuccess
        tone={tone}
        labels={labels}
        sentence={state.sentence}
        reference={state.reference}
        replyTime={state.replyTime}
        whatsappUrl={state.whatsappUrl}
        message={config.successMessage}
        onAnother={() => {
          setDismissed(true)
          setValues(initialValues(config))
          setCustom({})
        }}
      />
    )
  }

  const onFilterKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      if (query) setQuery('')
      else if (expanded) collapse()
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      const first = drawerRef.current?.querySelector<HTMLInputElement>(
        'input[type="radio"]:not([disabled]), input[data-row]:not([disabled])',
      )
      if (expanded) first?.focus()
      else if (first) revealGroup(first.name, false)
    }
  }

  const onDrawerKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && expanded && !event.defaultPrevented) {
      event.preventDefault()
      collapse()
    }
  }

  const isMac = hydrated && /Mac|iPhone|iPad/.test(navigator.userAgent)

  return (
    <BriefBar as="div" tone={tone} data-testid="brief-builder" data-expanded={expanded}>
      <form
        ref={formRef}
        action={formAction}
        onSubmit={onSubmit}
        noValidate
        aria-label={labels.barLabel}
      >
        <input type="hidden" name="locale" value={config.locale} />
        <input type="hidden" name="sourcePath" value={sourcePath} />
        <input type="hidden" name="js" value={hydrated ? '1' : ''} />
        {/* Honeypot for bots; hidden from people and assistive tech. */}
        <div aria-hidden="true" className="absolute -start-[9999px] h-px w-px overflow-hidden">
          <label>
            Website
            <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
          </label>
        </div>

        <BarField
          trailing={
            <div className="js-only -me-2 -mt-[7px] flex shrink-0 items-center gap-1">
              {hydrated ? (
                <KeyHint className="text-mute">
                  {isMac ? <CommandIcon width={12} height={12} aria-label="Command" /> : 'Ctrl'}
                  <span>K</span>
                </KeyHint>
              ) : null}
              <button
                ref={toggleRef}
                type="button"
                onClick={() => toggleOptions()}
                aria-expanded={expanded}
                aria-controls={drawerId}
                aria-keyshortcuts="Meta+K Control+K"
                aria-label={expanded ? labels.hideOptions : labels.showOptions}
                title={expanded ? labels.hideOptions : labels.showOptions}
                data-testid="brief-toggle"
                className="group grid size-11 place-items-center rounded-[var(--radius-row)]"
              >
                <span className="grid size-[30px] place-items-center rounded-[var(--radius-tile)] bg-tile text-tile-ink transition-colors duration-100 group-hover:text-ink group-active:bg-ink/[0.14]">
                  <ChevronDownIcon
                    width={16}
                    height={16}
                    className={cx(
                      'motion-safe:transition-transform motion-safe:duration-300',
                      expanded && 'rotate-180',
                    )}
                  />
                </span>
              </button>
            </div>
          }
          filter={
            <div className="js-only mt-2.5 ps-[34px]">
              <label htmlFor={`${uid}-filter`} className="sr-only">
                {labels.filterPlaceholder}
              </label>
              <input
                ref={filterRef}
                id={`${uid}-filter`}
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  if (e.target.value) setExpanded(true)
                }}
                onKeyDown={onFilterKey}
                placeholder={labels.filterPlaceholder}
                autoComplete="off"
                enterKeyHint="search"
                className="w-full rounded-md bg-transparent py-1 text-[15px] text-ink outline-none placeholder:text-mute"
              />
            </div>
          }
        >
          <p data-testid="brief-sentence" aria-live="polite">
            {parts.map((part, i) => {
              if (part.type === 'text')
                return (
                  <span key={i} className="text-mute">
                    {part.value}
                  </span>
                )
              const slot = config.slots.find((s) => s.token === part.name)
              if (!slot) return <span key={i} className="text-mute">{`{${part.name}}`}</span>
              const { text, set } = labelFor(slot)
              return (
                <a
                  key={i}
                  href={`#${uid}-group-${slot.token}`}
                  onClick={(event) => {
                    if (!hydrated) return
                    event.preventDefault()
                    revealGroup(slot.token)
                  }}
                  // A chosen word is a Spotlight-style token: a rounded selection-blue tint that
                  // keeps its shape when it wraps; an unset word stays an italic invitation.
                  className={cx(
                    'rounded-[6px] px-[5px] py-px transition-colors duration-100 [box-decoration-break:clone] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--focus)]',
                    errors[slot.token]
                      ? 'bg-attention text-on-attention'
                      : set
                        ? 'bg-selected text-ink hover:bg-selected-hover'
                        : 'text-mute italic hover:bg-ink/[0.06]',
                  )}
                  data-state={errors[slot.token] ? 'attention' : set ? 'set' : 'open'}
                >
                  {text}
                </a>
              )
            })}
            {hydrated ? <span className="caret" aria-hidden="true" /> : null}
          </p>
        </BarField>

        <div className="pt-1.5 pb-2">
          <span className="group-label block px-4 pt-1 pb-1">{labels.topHit}</span>
          <TopHit
            label={pending ? labels.submitting : config.submitLabel}
            pending={pending}
            testId="brief-submit"
          />
          {formError ? (
            <p
              role="alert"
              className="mx-4 mt-2 rounded-md bg-attention px-3 py-2 text-[14px] text-on-attention"
            >
              {errorText(formError)}
            </p>
          ) : null}
        </div>

        <div
          id={drawerId}
          ref={drawerRef}
          className="bar-drawer"
          data-open={expanded}
          onKeyDown={onDrawerKey}
        >
          <div>
            {config.slots.map((slot) => {
              const groupId = `${uid}-group-${slot.token}`
              const error = errors[slot.token]
              const message = error ? (
                <p
                  id={`${groupId}-error`}
                  className="mx-4 mb-1 rounded-md bg-attention px-2.5 py-1.5 text-[14px] text-on-attention"
                >
                  {errorText(error)}
                </p>
              ) : null

              if (slot.kind === 'date' || slot.kind === 'number') {
                if (query) return null
                const value = values[slot.token] ?? ''
                return (
                  <ResultGroup
                    key={slot.token}
                    id={groupId}
                    label={slot.groupLabel}
                    message={message}
                    className="border-t border-hair"
                  >
                    <label
                      className={cx(
                        rowClass(value ? 'set' : error ? 'attention' : 'open'),
                        'relative',
                      )}
                    >
                      <GlyphTile tone={value ? 'set' : 'default'}>
                        {value ? (
                          <CheckIcon width={15} height={15} />
                        ) : slot.kind === 'date' ? (
                          <CalendarIcon width={16} height={16} />
                        ) : (
                          '#'
                        )}
                      </GlyphTile>
                      {/* With JavaScript the row reads as a sentence part and the native control sits
                      invisibly over it (tapping opens the picker); without it the control shows. */}
                      <span className="js-only min-w-0 truncate text-[16px]">
                        {value
                          ? slot.kind === 'date'
                            ? formatBriefDate(value, config.locale)
                            : value
                          : slot.kind === 'date'
                            ? labels.pickADate
                            : slot.placeholder}
                      </span>
                      <input
                        type={slot.kind === 'date' ? 'date' : 'number'}
                        name={slot.token}
                        value={value}
                        min={slot.kind === 'date' ? todayInZone() : 1}
                        onChange={(e) => select(slot, e.target.value)}
                        onClick={(e) => {
                          try {
                            e.currentTarget.showPicker?.()
                          } catch {}
                        }}
                        aria-describedby={error ? `${groupId}-error` : undefined}
                        aria-label={slot.groupLabel}
                        className="native-picker min-w-0 bg-transparent text-[16px] text-ink outline-none [color-scheme:inherit]"
                      />
                      <span className="text-end text-[13px] text-mute">
                        {value ? labels.set : slot.placeholder}
                      </span>
                    </label>
                  </ResultGroup>
                )
              }

              const all = visibleOptions(slot, personas)
              const visible = all.filter(matches)
              const typedIsOption = all.some((o) => normalise(o.label) === normalise(query))
              const offerCustom = slot.allowCustom && query.trim().length > 1 && !typedIsOption
              if (query && visible.length === 0 && !offerCustom) return null
              const selected = values[slot.token]
              // Without a filter, show the chosen row plus the first few; the rest sit behind "more".
              const head = query
                ? visible
                : visible.filter((o, i) => i < COLLAPSED_ROWS || isChosen(slot, o.value))
              const tail = query ? [] : visible.filter((o) => !head.includes(o))
              const moreId = `${groupId}-more`

              const renderRow = (option: BuilderOption) => {
                const isSet = isChosen(slot, option.value)
                return (
                  <label
                    key={option.value}
                    className={rowClass(isSet ? 'set' : 'open')}
                    data-testid={`brief-option-${slot.token}-${option.value}`}
                  >
                    <input
                      type={slot.multiple ? 'checkbox' : 'radio'}
                      data-row=""
                      name={slot.token}
                      value={option.value}
                      checked={isSet}
                      onChange={() => (slot.multiple ? toggle(slot, option.value) : select(slot, option.value))}
                      className="sr-only"
                      aria-describedby={error ? `${groupId}-error` : undefined}
                    />
                    <RowContent
                      glyph={isSet ? <CheckIcon width={15} height={15} /> : option.glyph}
                      label={option.label}
                      state={isSet ? 'set' : 'open'}
                      trailing={isSet ? labels.set : null}
                    />
                  </label>
                )
              }

              return (
                <ResultGroup
                  key={slot.token}
                  as="fieldset"
                  id={groupId}
                  label={
                    slot.multiple ? (
                      <>
                        {`${slot.groupLabel} · `}
                        <span className="font-normal normal-case">{labels.pickAny}</span>
                      </>
                    ) : (
                      slot.groupLabel
                    )
                  }
                  message={message}
                  className="border-t border-hair"
                >
                  {head.map(renderRow)}
                  {tail.length > 0 ? (
                    <>
                      <input type="checkbox" id={moreId} className="peer sr-only" />
                      <div className="hidden peer-checked:block">{tail.map(renderRow)}</div>
                      <label
                        htmlFor={moreId}
                        className={cx(rowClass('open'), 'text-mute peer-checked:hidden')}
                      >
                        <GlyphTile>
                          <ChevronDownIcon width={14} height={14} />
                        </GlyphTile>
                        <span>{fill(labels.showMore, { count: tail.length })}</span>
                        <span />
                      </label>
                    </>
                  ) : null}
                  {offerCustom ? (
                    <label className={rowClass(selected === CUSTOM_VALUE ? 'set' : 'open')}>
                      <input
                        type="radio"
                        name={slot.token}
                        value={CUSTOM_VALUE}
                        checked={selected === CUSTOM_VALUE}
                        onChange={() => chooseCustom(slot, query.trim())}
                        className="sr-only"
                      />
                      <RowContent glyph="Aa" label={`“${query.trim()}”`} trailing={labels.orType} />
                    </label>
                  ) : null}
                  {slot.allowCustom ? (
                    <div className={cx('px-4 pb-1.5', hydrated && 'hidden')}>
                      <label className="block text-[13px] text-mute">
                        {labels.orType}
                        <input
                          type="text"
                          name={`${slot.token}${CUSTOM_SUFFIX}`}
                          maxLength={80}
                          value={selected === CUSTOM_VALUE ? (custom[slot.token] ?? '') : undefined}
                          readOnly={hydrated}
                          className="mt-1 block w-full rounded-md border border-hair bg-transparent px-2.5 py-1.5 text-[15px] text-ink"
                        />
                      </label>
                    </div>
                  ) : null}
                </ResultGroup>
              )
            })}

            {!query ? (
              <ResultGroup label={labels.actions} className="border-t border-hair pb-2">
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={rowClass('open')}
                  data-testid="whatsapp-secondary"
                >
                  <RowContent
                    glyph={<WhatsAppIcon width={16} height={16} />}
                    label={labels.whatsappInstead}
                  />
                </a>
                {providerLabel ? (
                  <a href={providerHref} className={rowClass('open')}>
                    <RowContent glyph="+" label={providerLabel} />
                  </a>
                ) : null}
              </ResultGroup>
            ) : null}
          </div>
        </div>
      </form>
    </BriefBar>
  )
}
