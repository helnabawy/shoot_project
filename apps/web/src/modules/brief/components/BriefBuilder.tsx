'use client'

import { formatBriefDate } from '@shoot/domain/brief/message'
import { optionsForSlot } from '@shoot/domain/brief/options'
import { omitTokens, parseSentence, sentenceTokens } from '@shoot/domain/brief/sentence'
import { joinMultiValue, splitMultiValue, todayInZone, validateBrief } from '@shoot/domain/brief/validate'
import {
  Fragment,
  useActionState,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { PhotoTile } from '@/modules/creators/client'
import { useHydrated } from '@/shared/ui/useHydrated'
import {
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  CommandIcon,
  ForwardIcon,
  WhatsAppIcon,
} from '@/shared/ui/icons'
import { BarField, BriefBar, cx, GlyphTile, KeyHint, ResultGroup, RowContent, rowClass, TopHit } from '@/shared/ui/bar'
import { submitBrief } from '../actions'
import type { CreatorBooking } from '../creator'
import { chosenPersonas, CUSTOM_SUFFIX, CUSTOM_VALUE, readSlotValues, sentenceLabelFor, slotRules } from '../submit'
import type { BriefBuilderConfig, BriefState, BuilderOption, BuilderSlot } from '../types'
import { fill, type BriefLabels } from '../labels'
import { BriefSuccess } from './BriefSuccess'

/** Rows a step lists before "Show N more". */
const STEP_ROWS = 6
/** A choice made with the arrow keys within this window only moves the selection, not the step. */
const ARROW_WINDOW_MS = 80

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
  /** The brief is for this creator (feature 002): shown as a set row and posted as the hidden `creator` field. */
  creator?: CreatorBooking
  /** A step answered for the visitor and not asked again, e.g. the professional of a single-type creator. */
  locked?: { token: string; value: string } | null
  /**
   * Answers the page starts with (an intent page, feature 005): shown as set steps, posted with the brief
   * and changeable by the visitor, unlike `locked`.
   */
  preset?: Record<string, string>
}

/** Slots in the order the sentence asks them; slots missing from the sentence come last. */
function orderSlots(config: BriefBuilderConfig): BuilderSlot[] {
  const tokens = sentenceTokens(config.sentence)
  const asked = tokens
    .map((token) => config.slots.find((s) => s.token === token))
    .filter((s): s is BuilderSlot => Boolean(s))
  return [...asked, ...config.slots.filter((s) => !tokens.includes(s.token))]
}

/** Options a step offers for the chosen professionals, its default listed first (FR-048, FR-067). */
function visibleOptions(slot: BuilderSlot, personas: readonly string[]): BuilderOption[] {
  let list = slot.options
  if (slot.kind !== 'persona') {
    const allowed = new Set(
      optionsForSlot(
        slot.options.map((o, i) => ({ value: o.value, label: o.label, order: i, active: true, personas: o.personas })),
        personas,
      ).map((o) => o.value),
    )
    list = slot.options.filter((o) => allowed.has(o.value))
  }
  const suggested = list.find((o) => o.value === slot.defaultValue)
  return suggested ? [suggested, ...list.filter((o) => o !== suggested)] : list
}

/** A step that waits for "Continue": several choices, or a typed number. */
const needsContinue = (slot: BuilderSlot) => slot.multiple || slot.kind === 'number'

const normalise = (s: string) =>
  s
    .toLocaleLowerCase()
    .normalize('NFKD')
    .replace(/[ً-ٰٟ]/g, '')

export function BriefBuilder({
  config,
  whatsappHref,
  providerHref,
  providerLabel,
  sourcePath,
  labels,
  tone = 'default',
  creator,
  locked = null,
  preset,
}: BriefBuilderProps) {
  const errorText = (key: string) => labels.errors[key] ?? labels.errors['brief.errors.generic'] ?? key
  const uid = useId()
  const hydrated = useHydrated()
  const [state, formAction, pending] = useActionState<BriefState, FormData>(submitBrief, { status: 'idle' })

  // Nothing is pre-filled for the visitor (FR-067); only a step the creator fixes starts answered and locked.
  const lockedValues = useMemo<Record<string, string>>(() => (locked ? { [locked.token]: locked.value } : {}), [locked])
  const isLocked = (slot: BuilderSlot) => locked?.token === slot.token
  // Preset answers are real answers: a step that waits for "Continue" counts as continued.
  const initialValues = useMemo<Record<string, string>>(() => ({ ...(preset ?? {}), ...lockedValues }), [preset, lockedValues])
  const initialConfirmed = useMemo<Record<string, boolean>>(() => Object.fromEntries(Object.keys(initialValues).map((token) => [token, true])), [initialValues])
  const [values, setValues] = useState<Record<string, string>>(initialValues)
  const [custom, setCustom] = useState<Record<string, string>>({})
  const [skipped, setSkipped] = useState<Record<string, boolean>>({})
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>(initialConfirmed)
  /** A step the visitor reopened by tapping its word, or an error sent them back to. */
  const [editing, setEditing] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  /** After a keyboard choice, focus moves to the next step ('next') or the reopened choice ('checked'). */
  const [focusTarget, setFocusTarget] = useState<'next' | 'checked' | null>(null)
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({})
  const [dismissed, setDismissed] = useState(false)
  const popup = useRef<Window | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const arrowAt = useRef(Number.NEGATIVE_INFINITY)

  const order = useMemo(() => orderSlots(config), [config])
  const allParts = useMemo(() => parseSentence(config.sentence, config.slots.map((s) => s.token)), [config])

  // A new answer from the server shows its errors again and reopens the first step they concern.
  const [seenState, setSeenState] = useState(state)
  if (state !== seenState) {
    setSeenState(state)
    setDismissed(false)
    if (state.status === 'error') {
      const first = order.find((s) => state.errors[s.token])
      if (first) setEditing(first.token)
    }
  }

  const personas = chosenPersonas(config, values)
  const hasValue = (slot: BuilderSlot) => {
    const value = values[slot.token] ?? ''
    if (value === CUSTOM_VALUE) return Boolean(custom[slot.token])
    return slot.multiple ? splitMultiValue(value).length > 0 : value !== ''
  }
  // A locked step is answered from the start, even when its list takes several choices and would wait for Continue.
  const answered = (slot: BuilderSlot) =>
    isLocked(slot) ||
    Boolean(skipped[slot.token]) || (hasValue(slot) && (!needsContinue(slot) || Boolean(confirmed[slot.token])))
  const isChosen = (slot: BuilderSlot, value: string) => {
    const current = values[slot.token] ?? ''
    return slot.multiple ? splitMultiValue(current).includes(value) : current === value
  }

  const firstOpen = order.find((s) => !answered(s)) ?? null
  const current = (editing ? order.find((s) => s.token === editing) : undefined) ?? firstOpen
  const complete = firstOpen === null
  const started = order.some((s) => hasValue(s) || skipped[s.token])
  const showTopHit = complete && !editing

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

  // Keyboard choices keep the visitor's place: the next step's first row, or the reopened choice.
  useEffect(() => {
    if (!focusTarget) return
    const frame = requestAnimationFrame(() => {
      const root = formRef.current
      const step = root?.querySelector('[data-current="true"]')
      const target =
        (focusTarget === 'checked' ? step?.querySelector<HTMLElement>('input[data-row]:checked') : null) ??
        step?.querySelector<HTMLElement>('input[data-row], input[type="date"], input[type="number"], button') ??
        root?.querySelector<HTMLElement>('[data-testid="brief-submit"]')
      target?.focus()
      setFocusTarget(null)
    })
    return () => cancelAnimationFrame(frame)
  }, [focusTarget])

  // Cmd+K (Ctrl+K elsewhere) puts the caret in the field from anywhere on the page (FR-065). The
  // physical key is matched, so it works on an Arabic keyboard layout too.
  useEffect(() => {
    if (success) return
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.code !== 'KeyK' || !(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey || event.repeat) return
      event.preventDefault()
      formRef.current?.scrollIntoView?.({ block: 'nearest' })
      inputRef.current?.focus({ preventScroll: true })
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [success])

  const errors = state.status === 'error' && !dismissed ? { ...state.errors, ...clientErrors } : clientErrors
  const formError = state.status === 'error' && !dismissed ? state.formError : undefined

  const labelFor = (slot: BuilderSlot): string => {
    const value = values[slot.token] ?? ''
    if (value === CUSTOM_VALUE) return custom[slot.token] || slot.placeholder
    if (!value) return slot.placeholder || labels.chooseOne
    if (slot.kind === 'date') return formatBriefDate(value, config.locale)
    if (slot.kind === 'number') return value
    return sentenceLabelFor(slot, value, config.locale)
  }

  /** Sets a step's value; a single choice moves on unless it was made with the arrow keys. */
  function select(slot: BuilderSlot, value: string, advance = true) {
    setValues((existing) => {
      const next = { ...existing, [slot.token]: value }
      if (slot.kind === 'persona') {
        // A new professional drops answers it does not offer, so their steps are asked again (FR-048).
        const chosen = chosenPersonas(config, next)
        for (const other of config.slots) {
          const answer = next[other.token]
          if (other.kind !== 'options' || !answer || answer === CUSTOM_VALUE) continue
          if (!visibleOptions(other, chosen).some((o) => o.value === answer)) next[other.token] = ''
        }
      }
      return next
    })
    setSkipped(({ [slot.token]: _skip, ...rest }) => rest)
    if (!needsContinue(slot)) setEditing(advance ? null : slot.token)
    setClientErrors(({ [slot.token]: _removed, ...rest }) => rest)
    setDismissed(true)
    setQuery('')
  }

  /** Ticks or unticks one value of a step that takes several (FR-063). */
  function toggle(slot: BuilderSlot, value: string) {
    const chosen = splitMultiValue(values[slot.token] ?? '')
    select(slot, joinMultiValue(chosen.includes(value) ? chosen.filter((v) => v !== value) : [...chosen, value]), false)
  }

  function chooseCustom(slot: BuilderSlot, text: string) {
    setCustom((c) => ({ ...c, [slot.token]: text }))
    select(slot, CUSTOM_VALUE)
  }

  function continueStep(slot: BuilderSlot) {
    setConfirmed((c) => ({ ...c, [slot.token]: true }))
    setEditing(null)
    setQuery('')
  }

  /** An optional step answered with "any" (e.g. "any date"). */
  function skip(slot: BuilderSlot) {
    setValues((v) => ({ ...v, [slot.token]: '' }))
    setSkipped((s) => ({ ...s, [slot.token]: true }))
    setEditing(null)
    setQuery('')
  }

  function reopen(token: string) {
    if (locked?.token === token) return
    setEditing(token)
    setQuery('')
    setFocusTarget('checked')
  }

  /** Backspace in the empty field: takes back the last answer in sentence order. */
  function takeBack() {
    const last = [...order].reverse().find((s) => !isLocked(s) && (hasValue(s) || skipped[s.token]))
    if (!last) return
    const clear = <T,>(record: Record<string, T>) => {
      const { [last.token]: _gone, ...rest } = record
      return rest
    }
    setValues(clear)
    setCustom(clear)
    setSkipped(clear)
    setConfirmed(clear)
    setEditing(null)
  }

  function reset() {
    setValues(initialValues)
    setCustom({})
    setSkipped({})
    setConfirmed(initialConfirmed)
    setEditing(null)
    setQuery('')
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const data = new FormData(event.currentTarget)
    const { values: resolved, custom: typed } = readSlotValues(config, data)
    const found = validateBrief(slotRules(config, resolved, typed), resolved, { today: todayInZone() })
    const first = order.find((s) => found[s.token])
    if (first) {
      event.preventDefault()
      setClientErrors(found)
      setEditing(first.token)
      return
    }
    setClientErrors({})
    setDismissed(false)
    // Opened inside the tap so browsers allow it; pointed at WhatsApp once the brief is saved.
    popup.current = window.open('', '_blank')
  }

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
          reset()
        }}
      />
    )
  }

  const matches = (o: BuilderOption) => !query || normalise(o.label).includes(normalise(query))
  const promptFor = (slot: BuilderSlot) => (slot.kind === 'date' ? labels.pickADate : slot.placeholder || labels.chooseOne)
  // While a step already has an answer (several choices, or a reopened step) its word stays in the
  // sentence and the caret waits right after it.
  const placeholder = !started
    ? (creator?.prompt ?? labels.searchPrompt)
    : current && !showTopHit
      ? hasValue(current)
        ? ''
        : promptFor(current)
      : ''

  /** The rows Return in the field would pick: the first match of the first list shown. */
  const firstMatch = () =>
    formRef.current?.querySelector<HTMLInputElement>('[data-group]:not([hidden]) label:not([hidden]) input[data-row]')

  const onFieldKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      if (query) setQuery('')
      else if (editing) setEditing(null)
    } else if (event.key === 'Backspace' && !query && !event.currentTarget.selectionStart) {
      event.preventDefault()
      takeBack()
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      formRef.current
        ?.querySelector<HTMLElement>('[data-group]:not([hidden]) :is(input[data-row], input[type="date"], input[type="number"], button)')
        ?.focus()
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (query) {
        const row = firstMatch()
        if (row) row.click()
        else if (current?.allowCustom && query.trim().length > 1) chooseCustom(current, query.trim())
      } else if (current && needsContinue(current) && hasValue(current)) {
        continueStep(current)
      } else if (showTopHit) {
        formRef.current?.requestSubmit()
      }
    }
  }

  const onRowKey = (event: KeyboardEvent<HTMLInputElement>, slot: BuilderSlot, value: string) => {
    if (event.key.startsWith('Arrow')) arrowAt.current = event.timeStamp
    if (event.key === 'Escape') {
      event.preventDefault()
      setEditing(null)
      inputRef.current?.focus()
    }
    if (event.key === 'Enter') {
      // Return chooses the focused row and moves on; it never sends an unfinished form.
      event.preventDefault()
      if (slot.multiple) {
        if (hasValue(slot)) continueStep(slot)
      } else {
        select(slot, value, true)
      }
      setFocusTarget('next')
    }
  }

  const byArrow = (event: { timeStamp: number }) => event.timeStamp - arrowAt.current < ARROW_WINDOW_MS

  // The field: the sentence so far, with the caret and the search input where the next answer goes.
  const currentToken = showTopHit ? null : (current?.token ?? null)
  const isMac = hydrated && /Mac|iPhone|iPad/.test(navigator.userAgent)
  const input = (
    <Fragment key="field">
      {hydrated && !focused && !query ? <span className="caret" aria-hidden="true" /> : null}
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onFieldKey}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        aria-label={placeholder || (showTopHit ? labels.typeToChange : current?.groupLabel) || labels.barLabel}
        autoComplete="off"
        enterKeyHint={showTopHit && !query ? 'send' : 'search'}
        size={Math.max(1, [...(query || placeholder)].length + 1)}
        className="js-only bar-input inline-block max-w-full min-w-[2px] appearance-none bg-transparent p-0 align-baseline text-ink outline-none [caret-color:var(--accent)] placeholder:text-mute [&::-webkit-search-cancel-button]:appearance-none"
      />
    </Fragment>
  )

  const shownParts = omitTokens(allParts, (name) => {
    const slot = config.slots.find((s) => s.token === name)
    return Boolean(slot && name !== currentToken && !hasValue(slot))
  })
  const fieldItems: ReactNode[] = []
  if (!started) {
    fieldItems.push(
      input,
      <span key="nojs" className="no-js-only text-mute">
        {labels.noJsHint}
      </span>,
    )
  } else {
    shownParts.forEach((part, i) => {
      if (part.type === 'text') {
        fieldItems.push(
          <span key={`t${i}`} className="text-mute">
            {part.value}
          </span>,
        )
        return
      }
      const slot = config.slots.find((s) => s.token === part.name)
      const active = part.name === currentToken
      if (active && !(slot && hasValue(slot))) {
        fieldItems.push(input)
        return
      }
      if (!slot) {
        fieldItems.push(
          <span key={`u${i}`} className="text-mute">{`{${part.name}}`}</span>,
        )
        return
      }
      if (isLocked(slot)) {
        // The creator fixes this part: a token that cannot be reopened.
        fieldItems.push(
          <span key={`k-${slot.token}`} data-state="locked" className="bar-token rounded-[6px] bg-selected px-[5px] py-px text-ink [box-decoration-break:clone]">
            {labelFor(slot)}
          </span>,
        )
        return
      }
      const error = errors[slot.token]
      fieldItems.push(
        <a
          key={`k-${slot.token}`}
          href={`#${uid}-group-${slot.token}`}
          onClick={(event) => {
            if (!hydrated) return
            event.preventDefault()
            reopen(slot.token)
          }}
          // A chosen word is a Spotlight-style token: a rounded selection-blue tint that keeps its
          // shape when it wraps. Tapping it asks that step again.
          className={cx(
            'bar-token rounded-[6px] px-[5px] py-px transition-colors duration-100 [box-decoration-break:clone] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--focus)]',
            error ? 'bg-attention text-on-attention' : 'bg-selected text-ink hover:bg-selected-hover',
            // The word of the step being asked again is ringed in selection blue.
            active && 'shadow-[0_0_0_1.5px_var(--accent)]',
          )}
          data-state={error ? 'attention' : 'set'}
          aria-current={active ? 'step' : undefined}
        >
          {labelFor(slot)}
        </a>,
      )
      if (active) fieldItems.push(<span key="gap-active"> </span>, input)
    })
    if (!currentToken) fieldItems.push(<span key="gap"> </span>, input)
  }

  // Which lists show: with JavaScript the asked step only, or every list with a match while
  // typing; without it, all of them (the plain form, FR-053).
  const anyMatch =
    Boolean(query) &&
    order.some((s) => (s.kind === 'persona' || s.kind === 'options') && visibleOptions(s, personas).some(matches))
  let shownBefore = 0
  let stepNo = 0
  const askedSteps = order.filter((s) => !isLocked(s)).length
  const groups: ReactNode[] = []
  for (const slot of order) {
    if (isLocked(slot)) {
      // The answer travels with the form; the list is never shown.
      groups.push(<input key={slot.token} type="hidden" name={slot.token} value={locked?.value} />)
      continue
    }
    stepNo += 1
    const groupId = `${uid}-group-${slot.token}`
    const error = errors[slot.token]
    const isCurrent = !query && current?.token === slot.token && !showTopHit
    const message = error ? (
      <p id={`${groupId}-error`} className="mx-4 mb-1 rounded-md bg-attention px-2.5 py-1.5 text-[14px] text-on-attention">
        {errorText(error)}
      </p>
    ) : null
    const heading = (
      <span className="flex items-baseline gap-2">
        <span>
          {slot.multiple ? (
            <>
              {`${slot.groupLabel} · `}
              <span className="font-normal normal-case">{labels.pickAny}</span>
            </>
          ) : (
            slot.groupLabel
          )}
        </span>
        {hydrated && isCurrent ? (
          <span data-step-count="" aria-hidden="true" className="ms-auto font-normal normal-case tabular-nums">
            {fill(labels.stepOf, { step: stepNo, total: askedSteps })}
          </span>
        ) : null}
      </span>
    )
    const skipRow =
      !slot.required ? (
        <button
          type="button"
          onClick={() => skip(slot)}
          data-testid={`brief-skip-${slot.token}`}
          className={cx(rowClass(skipped[slot.token] ? 'set' : 'open'), 'js-only w-[calc(100%-12px)] text-start')}
        >
          <RowContent
            glyph={
              skipped[slot.token] ? (
                <CheckIcon width={15} height={15} />
              ) : slot.kind === 'date' ? (
                <CalendarIcon width={16} height={16} />
              ) : (
                <ForwardIcon width={15} height={15} />
              )
            }
            label={slot.kind === 'date' ? slot.placeholder || labels.anyDate : slot.placeholder || labels.chooseOne}
            state={skipped[slot.token] ? 'set' : 'open'}
          />
        </button>
      ) : null
    const continueRow =
      isCurrent && needsContinue(slot) && hasValue(slot) ? (
        <div className="js-only pt-1 pb-1.5">
          <TopHit label={labels.continueLabel} onClick={() => continueStep(slot)} testId={`brief-continue-${slot.token}`} />
        </div>
      ) : null

    let shown: boolean
    let body: ReactNode
    if (slot.kind === 'date' || slot.kind === 'number') {
      shown = isCurrent
      const value = values[slot.token] ?? ''
      body = (
        <ResultGroup as="fieldset" id={groupId} label={heading} message={message}>
          <label className={cx(rowClass(value ? 'set' : error ? 'attention' : 'open'), 'relative')}>
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
              {value ? (slot.kind === 'date' ? formatBriefDate(value, config.locale) : value) : slot.kind === 'date' ? labels.pickADate : slot.placeholder}
            </span>
            <input
              type={slot.kind === 'date' ? 'date' : 'number'}
              name={slot.token}
              value={value}
              min={slot.kind === 'date' ? todayInZone() : 1}
              onChange={(e) => {
                const next = e.target.value
                // A date moves on once it is a real date from today on; a number waits for Continue.
                select(slot, next, slot.kind === 'date' && next !== '' && next >= todayInZone())
              }}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                e.preventDefault()
                if (slot.kind === 'number' && hasValue(slot)) continueStep(slot)
                else if (value) setEditing(null)
                setFocusTarget('next')
              }}
              onClick={(e) => {
                try {
                  e.currentTarget.showPicker?.()
                } catch {}
              }}
              aria-describedby={error ? `${groupId}-error` : undefined}
              aria-label={slot.groupLabel}
              className="native-picker min-w-0 bg-transparent text-[16px] text-ink outline-none [color-scheme:inherit]"
            />
            <span className="text-end text-[13px] text-mute">{value ? labels.set : null}</span>
          </label>
          {skipRow}
        </ResultGroup>
      )
    } else {
      const all = visibleOptions(slot, personas)
      const visible = all.filter(matches)
      const typedIsOption = all.some((o) => normalise(o.label) === normalise(query))
      // The visitor's own words are offered for the asked step when nothing in any list matches.
      const offerCustom =
        slot.allowCustom && query.trim().length > 1 && !typedIsOption && !anyMatch && current?.token === slot.token
      shown = query ? visible.length > 0 || offerCustom : isCurrent
      const selected = values[slot.token]
      // Without a search, the step lists its first rows plus the chosen ones; the rest sit behind "more".
      const head = query ? all : all.filter((o, i) => i < STEP_ROWS || isChosen(slot, o.value))
      const tail = query ? [] : all.filter((o) => !head.includes(o))
      const moreId = `${groupId}-more`

      const renderRow = (option: BuilderOption) => {
        const isSet = isChosen(slot, option.value)
        return (
          <label
            key={option.value}
            hidden={Boolean(query) && !matches(option)}
            className={rowClass(isSet ? 'set' : 'open')}
            data-testid={`brief-option-${slot.token}-${option.value}`}
          >
            <input
              type={slot.multiple ? 'checkbox' : 'radio'}
              data-row=""
              name={slot.token}
              value={option.value}
              checked={isSet}
              onChange={(e) => {
                if (slot.multiple) toggle(slot, option.value)
                else if (byArrow(e)) select(slot, option.value, false)
              }}
              onClick={(e) => {
                // A tap (or Space) chooses and moves on, even on the answer already chosen.
                if (!slot.multiple && !byArrow(e)) select(slot, option.value, true)
              }}
              onKeyDown={(e) => onRowKey(e, slot, option.value)}
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

      body = (
        <ResultGroup as="fieldset" id={groupId} label={heading} message={message}>
          {head.map(renderRow)}
          {tail.length > 0 ? (
            <>
              <input type="checkbox" id={moreId} className="peer sr-only" />
              <div className="hidden peer-checked:block">{tail.map(renderRow)}</div>
              <label htmlFor={moreId} className={cx(rowClass('open'), 'text-mute peer-checked:hidden')}>
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
                onChange={() => {}}
                onClick={() => chooseCustom(slot, query.trim())}
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
          {skipRow}
        </ResultGroup>
      )
    }

    // A hairline separates lists from what is above them: the Top Hit, or another list.
    const ruled = !hydrated || shownBefore > 0 || showTopHit
    if (shown) shownBefore += 1
    groups.push(
      <div
        key={slot.token}
        data-group={slot.token}
        data-current={isCurrent || undefined}
        hidden={hydrated && !shown}
        className={cx(!shown && 'js-hidden', isCurrent && 'bar-step', ruled && 'border-t border-hair')}
      >
        {body}
        {continueRow}
      </div>,
    )
  }

  return (
    <BriefBar as="div" tone={tone} data-testid="brief-builder">
      <form ref={formRef} action={formAction} onSubmit={onSubmit} noValidate aria-label={labels.barLabel}>
        <input type="hidden" name="locale" value={config.locale} />
        <input type="hidden" name="sourcePath" value={sourcePath} />
        <input type="hidden" name="js" value={hydrated ? '1' : ''} />
        {creator ? <input type="hidden" name="creator" value={creator.code} /> : null}
        {/* Honeypot for bots; hidden from people and assistive tech. */}
        <div aria-hidden="true" className="absolute -start-[9999px] h-px w-px overflow-hidden">
          <label>
            Website
            <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
          </label>
        </div>

        {creator ? (
          <div data-testid="brief-creator-chip" className="border-b border-hair py-1.5">
            <div className={cx(rowClass('set', false, 'photo'))}>
              <PhotoTile photo={creator.photo} initials={creator.initials} />
              <span className="min-w-0">
                <span className="block break-words font-semibold">{creator.name}</span>
                <span className="block text-[13px] font-normal text-selected-ink tabular-nums">
                  <bdi dir="ltr">{creator.displayCode}</bdi>
                </span>
              </span>
              <a
                href={creator.changeHref}
                className="-mx-2 inline-flex min-h-11 items-center px-2 text-[13px] font-medium text-selected-ink underline underline-offset-2"
              >
                {creator.changeLabel}
              </a>
            </div>
          </div>
        ) : null}

        <BarField
          trailing={
            hydrated ? (
              <KeyHint className="js-only mt-[5px] shrink-0 text-mute">
                {isMac ? <CommandIcon width={12} height={12} aria-label="Command" /> : 'Ctrl'}
                <span>K</span>
              </KeyHint>
            ) : null
          }
        >
          {/* Tapping the field anywhere outside a word puts the caret in the search input. */}
          <p
            data-testid="brief-sentence"
            aria-live="polite"
            onClick={(event) => {
              if (!(event.target as Element).closest('a, input')) inputRef.current?.focus()
            }}
          >
            {fieldItems}
          </p>
        </BarField>

        <div className={cx('pt-1.5 pb-2', !showTopHit && 'js-hidden')} hidden={hydrated && !showTopHit}>
          <span className="group-label block px-4 pt-1 pb-1">{labels.topHit}</span>
          <TopHit label={pending ? labels.submitting : config.submitLabel} pending={pending} testId="brief-submit" />
          {formError ? (
            <p role="alert" className="mx-4 mt-2 rounded-md bg-attention px-3 py-2 text-[14px] text-on-attention">
              {errorText(formError)}
            </p>
          ) : null}
        </div>

        {groups}

        <div hidden={Boolean(query)}>
          <ResultGroup label={labels.actions} className="border-t border-hair pb-2">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className={rowClass('open')}
              data-testid="whatsapp-secondary"
            >
              <RowContent glyph={<WhatsAppIcon width={16} height={16} />} label={labels.whatsappInstead} />
            </a>
            {providerLabel ? (
              <a href={providerHref} className={rowClass('open')}>
                <RowContent glyph="+" label={providerLabel} />
              </a>
            ) : null}
          </ResultGroup>
        </div>
      </form>
    </BriefBar>
  )
}
