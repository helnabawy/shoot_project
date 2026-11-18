# Plan: Start time in the brief (026)

**Spec**: `spec.md` · **Paths**: `W` = `apps/web/src`, `D` = `packages/domain/src`, `M` = `apps/mobile`.

## Approach

The landing page's brief builder (sentence, slots, WhatsApp template) stays untouched in the CMS. The
server adds the time step while building the client config (`W/modules/brief/config.ts`
`buildBriefConfig`) from the site settings group `briefTime`. Off, the config is the same object as
before (SC-001). On, it is one more slot of kind `time` with options from the chosen option set, the
token `time` inserted after `{date}` in the sentence and the WhatsApp template. Every consumer of the
config (website builder, `GET brief-builder`, `POST briefs`, the server action, the kept brief,
labels, message) then works from the same data; only the "waived with any date" rule and the start
time are new code.

### Domain (`D/brief/time.ts`)

- `startTimeOf(value)` → `HH:MM` or null (FR-003).
- `withTimeToken(template, { dateToken, timeToken, connector })` (FR-002).
- `isolateLtr(text)` wraps in U+2066 … U+2069 (FR-007).
- `SlotKind` gains `time`; `checkSlot` treats it like an option list (already generic).

### Web

- Site settings: tab "Start time", group `briefTime` { `enabled`, `times` (option-sets), `required`,
  `groupLabel`, `anyTime`, `connector` (localized) }. Migration adds the columns, creates the "Start
  times" option set (07-00 … 21-00, en and ar labels) and links it, and fills the words in en and ar.
  `payload-types.ts` regenerated.
- `config.ts`: `withBriefTime(config, settings, locale, words)`; `queries.ts` passes site settings and
  the fallback words (messages `brief.time.*`).
- `submit.ts`: `slotRules` waives the time slot without a date; `resolveBrief` drops a time without a
  date and returns `startTime`.
- `BriefBuilder.tsx`: the time step counts as answered when the date is skipped, is left out of the
  step count, `skip(date)` clears it; tokens and rows of a time step are `dir="ltr"`.
- Briefs: `startTime` (text, read-only, server only). `send-brief.ts`, `record-brief.ts` write it.
- Booking: `matchV1.brief.startTime`; `issue-quotation.ts` falls back to the brief's time.

### API (`D/api/v1/`)

`slotKindV1` adds `time`; `matchV1.brief.startTime` optional nullable; snapshot regenerated (additions
only).

### App (`M/lib`)

`SlotKind.time`; `BriefEngine` waives the time step without a date (next step, missing, take back,
skip of the date clears it) and the bar counts only asked steps; `briefRecordBody` leaves a waived
time out; time rows and words are isolated LTR; `QuickMatch` brief reads `startTime` and the details
step starts with it.

## Constitution check

- I: spec, plan, tasks, quickstart written first. III: tests named `BT-…` first. IV: times and words
  are CMS data (option set and localized fields), static fallbacks only. V: rules in `packages/domain`.
  VI: en/ar, LTR times, light/dark unchanged (existing tokens). VII: new fields `serverOnly`/admin
  update. VIII: no new package, service or abstraction. IX: one more optional step, off by default.

## Complexity Tracking

None.
