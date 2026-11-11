# Feature Specification: Mobile accent colour setting

**Feature Branch**: `006-mobile-accent-colour`

**Created**: 2026-11-10

**Status**: Draft

**Input**: User description: "Mobile app accent colour setting (Flutter app in apps/mobile). Each person can choose the app's accent colour in an Appearance setting next to the existing light/dark/system theme switch. The choice is from a curated set of about 5–6 accents; blue (#0A60FF light / #2B6BEB dark, today's accent) is the default and the first option. Each accent has tested light and dark values plus its derived roles (accent text ink, selected-row tint and hover, selection wash, focus ring), so every text and control pair stays WCAG 2.1 AA in both themes and both languages (English LTR, Arabic RTL). The accent drives selection only (selected rows and tiles, chips, progress, caret, focus); it does not change the primary action colour. The chosen accent is saved on the device and restored on next launch; the theme mode and language choices are saved the same way. No account is needed; changing it takes effect immediately with no restart. Out of scope: a free colour picker, syncing the choice across devices, the web site."

Test-id prefix for this feature: `MA-` (for example `MA-US1-S2`).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Choose an accent colour (Priority: P1)

A person using the Shoot mobile app opens the appearance settings, the same place they already switch between light, dark and match-device, and sees a short list of accent colours, each shown as a swatch with its name in their language. Blue is marked as the current choice the first time. They tap another accent and every selection colour in the app changes at once: selected rows and tiles, chips, progress bars, the text caret and focus rings. Primary actions keep their own fixed colour.

**Why this priority**: This is the feature. Without it nothing else in this spec has a purpose, and it is useful on its own even if the choice resets on the next launch.

**Independent Test**: Open the appearance setting, pick a non-default accent, and check that selection elements on the visible screen redraw in that accent within the same frame of interaction, while the primary action stays unchanged.

**Acceptance Scenarios**:

1. **Given** a first launch with no saved choice, **When** the person opens the appearance setting, **Then** the accent list shows every curated accent in a fixed order with Blue first and Blue marked as selected.
2. **Given** the appearance setting is open, **When** the person taps an accent other than the current one, **Then** that accent becomes the marked choice and every selection role on screen (selected row tint and its text, selected tile, chip, progress, caret, focus ring) uses that accent immediately, with no restart and no reload.
3. **Given** any accent is chosen, **When** a screen shows a primary action, **Then** the primary action's colour is the same as it is with Blue.
4. **Given** the app is in Arabic, **When** the person opens the appearance setting, **Then** the accent names are in Arabic, the list runs right to left, and the marked choice is announced the same way as in English.
5. **Given** a screen reader is on, **When** the person moves through the accent list, **Then** each option is announced with its name and whether it is selected, and the swatch alone is never the only way to tell options apart.

---

### User Story 2 - Keep the choice between launches (Priority: P2)

The person closes the app and opens it again later. The accent they chose is already applied on the first screen; they never see a flash of blue first. The light/dark/match-device choice and the language choice are kept the same way, since today all three reset on every launch.

**Why this priority**: A setting that resets every time is close to useless for a personal preference, but the picker (US1) can be shipped and demonstrated before saving exists.

**Independent Test**: Choose an accent, a theme mode and the non-default language, fully close the app, reopen it, and check all three are applied from the first frame.

**Acceptance Scenarios**:

1. **Given** the person chose a non-default accent, **When** they fully close and reopen the app, **Then** the first screen they see already uses that accent, with no frame drawn in the default blue.
2. **Given** the person chose dark (or light) and Arabic, **When** they reopen the app, **Then** it opens in that theme mode and in Arabic.
3. **Given** a saved accent that is no longer in the curated set (for example after an update removed it), **When** the app starts, **Then** it uses Blue and the setting shows Blue as selected.
4. **Given** the saved preferences cannot be read (missing or corrupted), **When** the app starts, **Then** it opens with the defaults (Blue, match device, the device's language when supported, else English) and does not crash or show an error.

---

### User Story 3 - Every accent stays readable (Priority: P3)

Whatever accent the person picks, text and controls drawn in or on it stay readable in light and dark: accent-coloured text on the page and on panels, white glyphs on a selected tile, selected-row labels on their tint, and the focus ring against the page.

**Why this priority**: Accessibility is a non-negotiable acceptance criterion in this project, but it is a property of the curated values rather than a separate screen; it is verified across the whole set once US1 exists.

**Independent Test**: For every accent in the set and both themes, measure each text/background and control/background pair the accent touches and check them against the thresholds in FR-007.

**Acceptance Scenarios**:

1. **Given** each curated accent in the light theme and in the dark theme, **When** its derived roles are measured, **Then** every pair listed in FR-007 meets its threshold.
2. **Given** each curated accent, **When** it is shown next to the danger, attention and success states, **Then** it is not confusable with them (it is not a red, and it is not the primary action colour).

---

### Edge Cases

- The person changes the accent while a selection animation or a focus ring is visible: the element redraws in the new accent without a stuck old colour.
- The person changes the device's system theme while the app is open and "match device" is chosen: the chosen accent's other theme values apply at once.
- The person changes language while the appearance setting is open: names and direction update in place and the marked choice is kept.
- Very large system text size: the accent list stays usable, names wrap rather than truncate, and each option keeps a touch target of at least 44 by 44.
- Reduced motion is on: switching accent changes colour without any transition animation.
- Saving the choice fails (storage full or unavailable): the new accent still applies for the current session and the app does not show an error.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST offer an accent choice inside the existing appearance controls, alongside light / dark / match device, reachable from every screen that shows those controls today.
- **FR-002**: The accent choice MUST be from a fixed curated set of 5 to 6 accents in a fixed order, Blue first. Blue MUST use today's values (#0A60FF light, #2B6BEB dark) and its current derived roles unchanged, so the app with Blue looks exactly as it does today.
- **FR-003**: Each option MUST show a swatch of the accent and a localised name (English and Arabic), and MUST mark the current choice with something other than colour alone (for example a check and a "selected" state for assistive technology).
- **FR-004**: Choosing an accent MUST apply it immediately to every selection role: selected row tint and hover, selected-row and accent text, selected glyph tiles, chips, progress indicators, the text caret and selection handles, the selection wash, and the focus ring.
- **FR-005**: The accent MUST NOT change the primary action colour, the danger / attention / success states, or any non-selection colour. Primary actions MUST use one fixed primary colour that does not depend on the accent.
- **FR-006**: Every accent MUST define a value for the light theme and for the dark theme for each derived role in FR-004; no role may be computed at run time from a person's input.
- **FR-007**: For every accent and both themes, these pairs MUST meet WCAG 2.1 AA: accent text on the page background and on panels ≥ 4.5:1; text and glyphs on the accent fill (selected tile) ≥ 4.5:1; selected-row text on the selected tint over the page and over panels ≥ 4.5:1; focus ring against the page and panels ≥ 3:1. These checks MUST be automated and fail the build when a value is changed below threshold.
- **FR-008**: No curated accent may be a red or be visually close to the primary action colour or the danger state: the hue of a coloured accent's fill, selected tint and focus ring is at least 30° away from the hue of the primary action colour and of the danger text colour; a neutral (near-grey) accent is exempt.
- **FR-009**: The chosen accent MUST be saved on the device and restored on the next launch before the first screen is drawn, so the first visible frame uses it.
- **FR-010**: The theme mode (light / dark / match device) and the language choice MUST be saved and restored the same way as the accent (FR-009).
- **FR-011**: If a saved accent, theme mode or language is unknown or unreadable, the app MUST fall back to its default for that value (Blue; match device; device language if supported, else English) silently.
- **FR-012**: If saving fails, the app MUST keep the new choice for the current session and MUST NOT show an error.
- **FR-013**: The setting MUST work without an account and without a network connection.
- **FR-014**: The accent list MUST meet the project's mobile accessibility rules: touch targets ≥ 44 × 44, works with screen readers in both languages, honours large text and reduced motion, and lays out right to left in Arabic.
- **FR-015**: Accent names and every new label MUST come from the app's localisation files in English and Arabic; Arabic is written, not machine translated.

### Key Entities

- **Accent**: one curated option. It has a stable identifier (kept in saved preferences, so it never changes once shipped), a localised name, a position in the list, and per-theme values for every derived role in FR-004.
- **Appearance preferences**: the person's saved choices on this device: accent identifier, theme mode, language. Each has a default used when nothing valid is saved.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A person can find the accent setting and change the accent in under 10 seconds from any screen that shows the appearance controls.
- **SC-002**: After a tap on an accent, every visible selection element shows the new accent in the same interaction, with no restart; 0 visible elements keep the old accent.
- **SC-003**: 100% of curated accents pass every pair in FR-007 in both themes, checked automatically on every build.
- **SC-004**: After a full close and reopen, 100% of test runs show the chosen accent, theme mode and language on the first visible frame, with no flash of the default.
- **SC-005**: With Blue chosen, the app is visually identical to the current app except that primary actions use the fixed primary red (FR-005); no other regression for people who never open the setting.
- **SC-006**: Every acceptance scenario `MA-US1-S1` … `MA-US3-S2` has an automated test named with its id.

## Assumptions

- The accent set is a fixed design-token set shipped with the app, not CMS content: it is a design decision with accessibility guarantees, like the web's colour tokens, so the constitution's "content lives in the CMS" rule does not apply. The exact accents beyond Blue (proposed: Teal, Green, Violet, Orange and Pink, tuned until FR-007 passes) are settled in the plan and approved by the owner before implementation.
- The mobile app today uses the accent for its filled buttons as well as for selection. Its primary action colour moves to its own fixed role, mirroring the web's `primary` (#E01414, decided 2026-11-10), as part of this feature so that FR-005 holds.
- The appearance controls stay where they are today (the app bar's theme menu); the plan decides whether the accent list sits in that menu or in a small appearance sheet it opens.
- Saving on the device needs a storage package the app does not have yet; the plan records it in Complexity Tracking, as the mobile README requires.
- The choice is per device. Signing in (not yet specified for mobile) does not sync or override it.
- The web site keeps its blue accent and gets no accent setting in this feature.
