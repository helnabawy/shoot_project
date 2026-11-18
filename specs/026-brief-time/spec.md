# Feature Specification: Start time in the brief

**Feature**: `026-brief-time` · **Test-id prefix**: `BT-` · **Created**: 2026-11-18 · **Status**: implemented

**Input**: the owner, 2026-11-18: "i want to add feature to enter a time after choosing a date and make
this feature optional in cms", with a screenshot of the landing page's brief builder ("I need a
photographer for a portrait session on Thu 19 Nov for how long.", step "How long", "4 of 6").

## Clarifications

### Session 2026-11-18 (decided by the building session, for the owner to confirm)

- Q: How is the time chosen? → A: from a list of times kept in the content area, like durations: an
  `option-sets` entry chosen in Site settings → "Start time". A ready list "Start times" (07:00 to
  21:00, every hour) is created with the switch. Each option's value is the time as `HH-MM` (e.g.
  `16-00`, the form an option value can take); its label is what the client reads (e.g. "16:00" or
  "4 pm"). A free time input was rejected: the owner decides which hours are offered, the step looks
  and works like every other step, and older app versions already show it as a list.
- Q: Can the step be skipped? → A: yes by default: an "Any time" row (its words in Site settings)
  answers it without a time. The owner can make it required ("Clients must choose a time").
- Q: What does "any date" do? → A: the time step is not asked and no time is kept: a start time
  without a day is not something a creator can plan for. A time that arrives with no date (an older
  app) is dropped by the server.
- Q: Where does the time go? → A: into the sentence right after the date with the owner's joining
  words ("on Thu 19 Nov at 16:00 for 2 hours"; Arabic "الساعة"), the WhatsApp message (same template),
  the brief record (its own "Start time" field as `HH:MM`, plus the selection), step 2 (the sentence;
  the app's step 3 starts with this time filled in) and the booking's `details.startTime` (from the
  app's step 3 as today, or from the brief when the website books it).
- Q: Where is the switch? → A: Site settings, tab "Start time", "Ask for a start time", off by default.
  While it is off, the builder, the sentence, the step count and every API answer are exactly as
  today: the step is added by the server only when the switch is on, so the content of the landing
  page (sentence, slots, WhatsApp template) is never edited.
- Q: How are times written in Arabic? → A: always left to right (bidi isolated), in the sentence, the
  list rows and the message.

## User Scenarios & Testing

### User Story 1: Pick a start time after the date (P1)

**Acceptance scenarios**

1. **BT-US1-S1** Given "Ask for a start time" is on, when a client picks a date on the website, then
   the next step is "Start time" listing the owner's times, and the step count includes it ("5 of 7").
2. **BT-US1-S2** Given they pick "16:00", then the sentence reads "… on Thu 19 Nov at 16:00 for …",
   the time is a token that reopens its step, and in Arabic the time reads left to right.
3. **BT-US1-S3** Given the step is optional, when they choose "Any time", then the sentence has no
   time and the brief goes out without one; when it is required, the brief cannot be sent without it.
4. **BT-US1-S4** Given they choose "any date", then the time step is not asked, it is not counted, and
   no time is kept even if one was picked before.
5. **BT-US1-S5** The same steps work in the app (screens of the brief bar), in English and Arabic.

### User Story 2: The time reaches the brief, WhatsApp and the booking (P1)

1. **BT-US2-S1** Given a brief sent with a time, then the brief record keeps it (`HH:MM`) and its
   selection, the stored sentence and the WhatsApp message carry it; from the app (`POST briefs`)
   too. A time with no date is dropped; a time not in the list is refused like any gone option.
2. **BT-US2-S2** Given step 2 of Quick Match for that brief, then the API's `brief.startTime` carries
   the time, the app's step 3 starts with it filled in (still changeable), and the quotation's booking
   keeps it in `details.startTime`; a booking made on the website keeps the brief's time there.

### User Story 3: Off means unchanged (P1)

1. **BT-US3-S1** Given the switch is off (the default), or no time list is chosen, or the sentence has
   no date, then the builder config, the sentence, the step count, `GET brief-builder` and every
   brief record are exactly as before this feature.
2. **BT-US3-S2** The owner turns the step on and off, edits the times, the joining words, the step
   label and the "Any time" words in Site settings, in English and Arabic, without a deployment.

## Requirements

- **FR-001** A Site settings switch "Ask for a start time" (default off) with: the time list (an
  option set), "Clients must choose a time" (default off), and localized "Step label", "Any time
  words" and "Joining words" (fall back to the site's static strings when empty).
- **FR-002** With the switch on, a time list with at least one active option and a date step in the
  sentence, the server adds one step of kind `time` right after the date: in the slot list, in the
  sentence and in the WhatsApp template (`{date} {joining words} {time}`). Otherwise nothing changes.
- **FR-003** A time option's value `HH-MM` (or `HH:MM`, `HHMM`) gives the start time `HH:MM` (24 h); a
  value in another form is shown and sent but gives no start time.
- **FR-004** With no date the time step is waived on every channel; the server drops a time without
  a date and checks a time with a date like any option (must be in the list; required if set so).
- **FR-005** Briefs get a read-only "Start time" (`HH:MM` or empty), set by the server only.
- **FR-006** API changes are additive: slot kind `time` in `GET brief-builder` (older apps read an
  unknown kind as a list and send it as a selection), `brief.startTime` (optional) in the match
  answer; `POST briefs` is unchanged (the time is a selection).
- **FR-007** A time is shown left to right in Arabic: isolated in the sentence word, the token and the
  list rows.
- **FR-008** The booking's `details.startTime`: the app's step 3 value (pre-filled from the brief), or
  the brief's time when the website issues the quotation.

## Success criteria

- **SC-001** With the switch off, every existing brief test passes unchanged.
- **SC-002** Every scenario above has a test named with its id (`pnpm check:scenarios`).
