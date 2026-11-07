# Usability and success-criteria record: 002 creator profiles

Recorded 2026-11-07 on the local dev server with the demo seed (`SEED_DEMO_CREATORS=1`), English, a 390 × 844
phone viewport. **Scripted measurements only.** The three-person manual timing in the quickstart has not been
run, and nothing below should be read as a participant result.

## SC-001: find a creator for a specialty and an emirate in under 30 seconds

| Path | Interactions | Wall time (scripted) |
|------|--------------|----------------------|
| Landing → Portrait in the Specialties list → Emirate filter → Dubai → Top Hit → profile | 4 | 1.9 s |
| Landing → "Our network" link → Specialty filter → Portrait → Emirate filter → Dubai → Top Hit → profile | 6 | 2.4 s |

The quickstart asks for at most 5 interactions on the landing → directory → filter → profile path. The route
through the Specialties list meets it (4). The directory route needs 6 only because it filters on both
specialty and emirate; with one filter it is 4 as well. Wall time says nothing about reading and deciding
time, which is what the 30 seconds is for, so this is a floor and not a result.

## SC-002: budgets on the creator pages

`lighthouserc.json` and `lighthouserc.dark.json` now include `/creators`, `/creators/d2222` and
`/work/portrait` in English and Arabic (light, and dark emulation). The CI Lighthouse job seeds demo creators
before it runs. **Not run locally:** Lighthouse CI runs in the pipeline.

## SC-003: a provider completes a profile in under 10 minutes; an admin verifies in under 2

Not measured with people. The provider end-to-end journey (`cp-us3-provider.spec.ts`) registers, fills both
languages, adds a sample, sends for review, has an admin publish it and asserts the whole run finishes within 10
minutes of scripted time; the admin step is one Publish action in Payload. The last full run of that spec was
deferred, so no fresh timing is recorded here.

## SC-004: every scenario has a test

`pnpm check:scenarios` checks the quickstart mapping table against the test files and their names. At the time
of writing it reports only the specialty e2e spec (`cp-us4-specialty.spec.ts`, task T068), which is deferred.

## Accessibility and right-to-left sweep (T077)

Scripted over `/creators`, `/creators/d2222`, `/book/d2222` and `/work/portrait`, English and Arabic, light and
dark, 360 and 1440 px (32 page states), with axe (WCAG 2 A/AA):

- No serious or critical axe violations. No horizontal overflow.
- The provider editor was walked with the keyboard (Tab through every control, order follows the page, a visible
  focus indicator on every control); its detector, captures and finish review are recorded in
  `.impeccable/review/`.
- Targets under 44 px: only the brief builder's text field on `/book/{code}` (the existing step-by-step builder
  from feature 001, reused unchanged), whose whole bar row is the tap area.

## Findings from this pass

- Directory photos were missing in cached summaries because the media select left out `filename`; fixed and
  covered by `creators-specialty.int.test.ts`.
- `pnpm audit --audit-level high` reports vitest (critical, only when its UI server runs) and two postcss highs
  among 14 findings. They come from the toolchain and predate this feature; upgrading is a separate, pinned-version decision.
