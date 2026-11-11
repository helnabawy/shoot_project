---
name: flutter-mobile
description: How to build the Shoot Flutter app in apps/mobile — clean-architecture layers by feature, the add-a-feature recipe, cubits and get_it, the design-system widget catalogue in core/widgets and the map from canvas board CSS classes (.top, .field, .chip, .seg, .ph, .sum/.srow, .sc) to widgets, the CSS-to-Flutter conversion rules (em letter-spacing, line-height with TextLeadingDistribution.even, box-shadow blur to sigma, linear/radial gradients, logical start/end edges), the motion tiers (react, arrive, ambient), the 5-second motion cap and reduced motion, session and secure storage, go_router paths and deep links that mirror the web, ShootImage, and the package policy. Use this skill for any task that touches apps/mobile or Dart code — a screen, widget, cubit, repository, route, theme token, animation, ARB string, package, or "make the app match the design" — and before planning any of the mobile features 007–015.
---

# Flutter mobile app (`apps/mobile`)

> **Status: planned.** Today `apps/mobile` is the boilerplate described in its README (one example
> feature, `service_health`). Everything below marked *planned* arrives with features 007–015
> (see `specs/ROADMAP.md`); each feature's `plan.md` carries the exact names and wins over this
> summary where they differ. The source plan is
> `~/.claude/plans/i-want-to-create-twinkling-walrus.md` (Steps 3 and 4).

The app is built from the approved design canvas: 40 phone screens at 360 px (boards 01–40) plus
two Arabic dark boards (42, 43), imported into `specs/design-system/canvas/`. The boards are the
design authority for app screens (see the `ui-design` skill), and every screen is checked against
its board pixel by pixel (see the `design-fidelity` skill). The app reads product data only through
the web app's versioned REST API, `/api/mobile/v1` (see the `mobile-api-contract` skill).

Before any change also read: the constitution (`.specify/memory/constitution.md`, v1.4.0,
Principles III, V, VI, VIII), `apps/mobile/README.md`, and the `testing-strategy` skill.

## Layers (binding today)

Clean architecture, organised by feature; dependencies point inward only.

```text
lib/
  main.dart, app.dart           entry point and shell (language, theme, router)
  core/                         shared by every feature, owns no feature logic
  features/<feature>/
    domain/                     pure Dart: entities, repository contracts, one use case per action
    data/                       models (fromJson, toEntity), datasources (throw), repositories (return Result)
    presentation/               cubit/ (sealed states), pages/ (one per route), widgets/ (the page's parts)
    <feature>_injection.dart    registers the feature in get_it
```

- **Errors.** Datasources throw `NetworkException` / `ServerException`; repositories return
  `Result<T>` (`Ok` / `Err(Failure)`). Nothing above `data/` sees an exception or a Dio type.
  `Result` and `Failure` are sealed; switch over them exhaustively.
- **Words.** A `Failure` carries no text. `core/l10n/failure_message.dart` is the one place a
  failure (and, planned, an API problem `code`) becomes a sentence.
- **DI.** Constructor injection. Only the composition root (`core/di/injection.dart`, `main.dart`,
  a page creating its cubit) reads `getIt`.
- **Imports.** `package:shoot_mobile/...` only. A feature never imports another feature's `data/`
  or `presentation/`; shared parts move to `core/`.
- **Strings.** Interface text lives in `app_en.arb` (with a description per key) and `app_ar.arb`.
  Product copy (professions, categories, options, prices, contact numbers, CMS pages) comes from
  the API, never from ARB or a Dart constant (see `persona-extensibility`).
- **Direction.** `EdgeInsetsDirectional`, `AlignmentDirectional`, `PositionedDirectional`,
  `BorderRadiusDirectional`, `TextAlign.start`. Never `left`/`right`.

## Add a feature (the recipe)

Inside out, test first; `service_health` is the template for shape, not content.

1. **Spec first.** No code without `spec.md`, `plan.md`, `tasks.md` (Principle I).
2. **Domain.** Entity, repository contract, one use case per action. Write the use-case test first.
3. **Data.** Model, datasource, repository implementation. Model tests decode the shared JSON
   examples from `packages/domain/src/api/v1/examples/` (*planned*, see `mobile-api-contract`);
   datasource tests use a stubbed Dio adapter.
4. **Presentation.** Sealed states and a cubit (`bloc_test`), then a `…Page` that creates the cubit
   and a `…View` that renders any state, so widget tests can supply states directly. Build the
   view only from `core/widgets/`; a screen that needs a new visual part adds it to the catalogue.
5. **Strings.** Both ARB files, description in `app_en.arb`.
6. **Wire it.** `<feature>_injection.dart`, called from `core/di/injection.dart`; the route in
   `core/routing/`, at the web's path.
7. **Goldens and fidelity** (*planned*). A screen golden per board in
   `test/goldens/screens/<id>_<name>_golden_test.dart`, four variants, then `pnpm fidelity`.
8. **Check.** `dart format --set-exit-if-changed lib test`, `flutter analyze` (no issues),
   `flutter test --coverage` (80 % of changed lines), `apps/mobile/tool/goldens.sh`, `pnpm fidelity`,
   `pnpm check:scenarios`; then the app on a 360 px phone in English and Arabic, light and dark, at
   the largest text size, with VoiceOver and TalkBack (Principle VI).

## `core/` additions (*planned*, feature 007 unless noted)

| Area | What | Notes |
|---|---|---|
| `theme/shoot_type.dart` | the type roles read from the boards (display 34/700 at -0.03em, action 17/600, body 15/1.6, meta 13/1.4, group label 11/600 uppercase, …; full table in 007's research R3) | tabular figures; Noto Sans Arabic as the Arabic fallback family name; even leading set once on the theme; values mirror the `--text-*` tokens in `tokens.css` |
| `theme/shoot_scene.dart` | `ThemeExtension` with scene, sweep and glow colours | light and dark values from `tokens.css` |
| `theme/shoot_shadows.dart` | panel, sheet, lift shadows | built through the CSS blur converter below |
| `theme/css_gradient.dart` | CSS `linear-gradient` / `radial-gradient` as Flutter `Gradient`s | unit-tested against known CSS geometry |
| `theme/shoot_tokens.dart` | + arrive and ambient durations, `staggerStep`, ambient curves | the react tier is already there |
| `theme/shoot_colors.dart` | + `primary`, `primaryHover`, `onPrimary` (fixed red #E01414) | from feature 006, which lands first |
| `widgets/` | the design-system catalogue, one widget per file | each with a widget test and a component golden |
| `motion/` | `MotionPolicy`, arrive widgets, `AmbientPause` | see Motion |
| `routing/` | web-mirroring paths, first-run redirect, account guard, `resolve` fallback | see Routing |
| `auth/` | `SessionStore`, `SessionCubit`, `AuthInterceptor`, `InstallIdInterceptor` | feature 009 (OTP sign-in); install id from 008 |
| `time/clock.dart` | injected `Clock` | tests use a fixed clock; no `DateTime.now()` outside it |
| `widgets/shoot_image.dart` | `ShootImage` | see Images |

## The widget catalogue and the board-class map

Every screen is assembled from `core/widgets/`. Reading a board, map its CSS classes to widgets;
never rebuild a catalogued part inside a feature. The binding catalogue is
`specs/007-mobile-foundation/contracts/component-catalogue.md`; the full class map is in
[`references/widget-catalogue.md`](references/widget-catalogue.md). The classes you meet most:

| Board class | Widget |
|---|---|
| `.hd` / `.wm` | `ShootHeader` (58 px) / `Wordmark` |
| `.top` | `TopHit` (the one primary action; fixed `primary` red) |
| `.field` | `ShootField` (`PickerField` for `button.field`) |
| `.chip` | `ShootChip` in a `ChipGroup` (not Material's `ChoiceChip`; see the naming note in the reference) |
| `.seg` | `SegmentedControl` |
| `.ph` | `PhoneField` |
| `.panel`, `.sum` / `.row` / `.srow` | `ShootPanel` / `ShootRow` / `SummaryRow` |
| `.sc` | `SceneTile` |

A board class with no entry is either an existing widget under another name (add the row) or a new
catalogue widget (add it in the feature that first needs it, with its test and component golden).

## CSS to Flutter (the conversions that decide pixel fidelity)

1 CSS px = 1 Flutter logical pixel. The full table with worked examples is in
[`references/css-to-flutter.md`](references/css-to-flutter.md). The rules that matter most:

- **Letter-spacing.** CSS `em` is relative to the font size: `letterSpacing = em × fontSize`
  (-0.03em at 34 px is `-1.02`). `px` values copy as they are.
- **Line-height.** CSS splits half-leading evenly above and below the glyphs; Flutter's default
  does not, which shifts text 1–3 px. `TextLeadingDistribution.even` is set once on the theme
  (`TextHeightBehavior`, 007 research R3), and every type role sets an explicit `height`
  (CSS `line-height: 1.25` → `height: 1.25`). A style built outside the theme sets `even` itself.
- **Shadow blur.** CSS `box-shadow` blur `B` is a Gaussian with σ = B / 2. Flutter's `BoxShadow`
  turns `blurRadius r` into σ = 0.57735·r + 0.5. So `blurRadius = max(0, (B / 2 − 0.5) / 0.57735)`;
  offsets and spread copy directly. `filter: blur(x)` / `backdrop-filter: blur(x)` already give σ:
  `ImageFilter.blur(sigmaX: x, sigmaY: x)`. Never paste a CSS blur into `blurRadius`.
- **Gradients.** CSS gradient geometry depends on the box: the `linear-gradient` line runs at the
  angle with length `|w·sin a| + |h·cos a|` (0deg points up, clockwise), and `radial-gradient`
  defaults to an ellipse sized to the farthest corner. Flutter's `Alignment`-based gradients do not
  reproduce that on non-square boxes, so use the `css_gradient.dart` helpers, which compute the
  shader from the painted `Rect`. CSS gradients are physical: mirror one in Arabic only when the
  board's own CSS does.
- **Logical edges.** `padding-inline-start` → `EdgeInsetsDirectional.only(start:)`. Physical CSS
  (`left`, `margin-right`) on a board is translated to the logical edge the design means; the
  derived Arabic reference shows whether it mirrors.
- **Opacity and colour.** Colours come from roles (`context.colors.ink`), never hex; a board's hex is
  a token in disguise (the fidelity tooling maps it back, see `design-fidelity`).

## Motion (*planned*)

Three tiers, all from `tokens.css`; no animation package (implicit and explicit Flutter animations
only).

| Tier | When | Values |
|---|---|---|
| **React** | answers a tap or a key, always | 120 / 180 / 260 ms, `standard` and `exit` curves (in `shoot_tokens.dart` today) |
| **Arrive** | plays once when a thing first appears | rise (500 ms, 70 ms stagger), focus (700), roll (700), tick (draw 500), grow (900), deal (600), write-in (1100), shake (450) |
| **Ambient** | only the landing loops (key light, glint, drift, pulse, tap) | behind one `AmbientPause` control on that screen |

- **The 5-second cap.** On every screen but the landing loops, self-started motion ends within 5 s
  (WCAG 2.2.2). `MotionPolicy` enforces it; an arrive sequence that would run longer is shortened
  or staggered less, never looped.
- **Reduced motion.** When `MediaQuery.disableAnimationsOf(context)` is true, every tier shows its
  end state at once (`Duration.zero`); ambient loops do not start. Screen goldens render with
  animations off, so the end state is also what the fidelity diff checks.
- Motion never carries meaning on its own: the end state says everything.

## Session and storage (*planned*)

- `SessionStore` keeps the Payload JWT and its expiry in `flutter_secure_storage` (iOS Keychain,
  Android Keystore). The Keychain survives an uninstall, so the first run of an install (a flag in
  `shared_preferences` is absent) wipes the secure store.
- `SessionCubit`: unknown → signedOut | signedIn(user from `GET /me`). The token is never logged,
  never put in a URL, never in `shared_preferences`.
- `AuthInterceptor` adds `Authorization: Bearer <token>`; on a 401 it refreshes once (single
  flight, `POST /refresh`), retries the request once, and otherwise signs out.
- `InstallIdInterceptor` sends `X-Shoot-Install` (a random id per install, kept in
  `shared_preferences`; not a secret) for the server's rate limits. Every request also sends
  `Accept-Language`.
- `shared_preferences` (feature 006) holds the accent, theme mode, language, the first-run flags and
  the install id. Saved choices are applied before the first frame (Principle VI).

## Routing and deep links (*planned*)

- go_router paths mirror the web, so a shared link opens the same thing: `/creators`,
  `/creators/:code`, `/book/:code`, `/work/:specialty`, `/match/:ref/:key`,
  `/match/:ref/:key/details`, `/q/:ref/:key`, `/account/**`, the guides, legal and `/hire/…`
  pages. An `/ar` prefix sets the locale. Path helpers mirror the web's `paths.ts` files.
- One redirect handles the first run (splash and the three learning steps, once per device) and
  guards `/account/**` (to sign-in, then back to where the person was).
- An unknown path calls `GET /api/mobile/v1/resolve?path=…`, which answers page, removed or not
  found; the app renders the CMS page, the removed state or the not-found screen.
- Universal links and app links come from the web's `/.well-known/apple-app-site-association` and
  `/.well-known/assetlinks.json` routes (feature 008).
- No bottom tab bar: the header and its menu (board 06) are the navigation.

## Images (*planned*)

`ShootImage` takes the API's list of image sizes, picks the smallest one at least as wide as the
rendered width × device pixel ratio, decodes with `cacheWidth`, and shows a `SceneTile` while
loading, on error and when there is no photo (honest empty state, no invented imagery). No image
caching package; a disk cache needs a measured problem and a Complexity Tracking entry.

## Package policy

- Versions pinned exactly in `pubspec.yaml` (no `^`). No code generation (`build_runner`,
  `freezed`, `json_serializable`, `injectable`) unless a plan justifies it.
- Prefer the SDK and existing packages. A new package needs a Complexity Tracking row in the
  feature's plan (the problem, the simpler alternative rejected), a licence check, and the README's
  package table updated in the same change.
- Current Complexity Tracking list for the mobile work:

| Package | Feature | Why | Simpler alternative rejected |
|---|---|---|---|
| `shared_preferences` | 006 | accent, theme mode and language survive a restart | hand-written platform channels; a JSON file plus `path_provider` |
| `flutter_svg` | 007 | the icons and the golden-hour scene are copied verbatim from the boards' SVG | hand-converting SVG paths to `CustomPainter` loses the verbatim match and doubles the review |
| `flutter_secure_storage` | 009 | the session token must live in the Keychain / Keystore | `shared_preferences` stores plain text |

## Reference files

- [`references/widget-catalogue.md`](references/widget-catalogue.md) — the catalogue by group, the
  board-class map, and what each widget must prove in its tests.
- [`references/css-to-flutter.md`](references/css-to-flutter.md) — conversion table with formulas,
  worked examples and the gotchas that show up in fidelity diffs.
