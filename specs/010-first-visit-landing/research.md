# Research: Mobile first visit and landing

## R1 Learning-step demonstrations (resolves FR-004)
**Decision**: live data, no invented proof. Step titles and text come from the landing's
`howItWorks` section (first three steps, CMS). Demonstrations use real listed creators from the
landing's creator network (name and types only; the price slot shows the interface string "Price
shown next", never a number) and the brief bar's own slot placeholders; the phone field shows its
hint only. If fewer than three steps (or the landing) cannot be read, the steps are skipped and stay
unseen. Goldens use fixed fixtures, clearly test data.
**Owner decision pending**: whether editors should author example creators and prices for these
steps (needs a CMS field).

## R2 Landing sections (resolves FR-025)
**Decision**: fixed app layout of the four designed sections; content from the first
`categoriesGrid` (occasions), `creatorNetwork`, `personaBand` and `callToAction` sections of
`GET /landing`; other and unknown types are skipped; a missing type leaves its section out.

## R3 Occasion tile to brief
A tile's category slug is applied to the first `options` slot that offers an option with that value
(the website's `resolvePresets` rule); no match: the tile opens the first step.

## R4 Strip minimum
Site settings has no minimum. The strip shows when the landing returns at least 4 cards
(`kMinStripCreators`, a layout constant: a 360 px strip shows four). Owner may add a setting later.

## R5 Recording a brief
No endpoint exists. Add `POST /api/mobile/v1/briefs` (auth opt, no-store). The install id
(`X-Shoot-Install`) is the visitor id for the duplicate fingerprint and hourly allowance; a Bearer
token links the member. The response carries `matchPath` (Quick Match step 2) when Quick Match is
on; the app opens it once feature 012 has built `/match/:ref/:key`, else it opens WhatsApp with the
composed message and shows the reference (FR-016).

## R6 Persisting Pause
`AmbientPause` (007) is in memory. Add optional `initiallyPaused` and `onChanged`; the landing
persists the choice in `PreferencesStore` (`landing.motionPaused`). Under reduced motion the stored
value is ignored for starting (FR-033): Play starts loops for the visit only.

## R7 Half-built brief lifetime
`BriefCubit` is a get_it singleton in memory only: survives navigation, lost on exit.

## R8 Accent row in the menu
Board 06 has no accent row. No accent control is added to the menu; the 006 Appearance sheet stays
where it is (gallery). Owner may change the canvas first.

## R9 Splash
`/welcome/0` is the splash (a 2 s one-shot, then `go('/welcome/1')`); `firstRunRedirect` is changed
from `/welcome/1` to `/welcome/0`. Steps 1-3 are `/welcome/1..3`.
