# Shoot mobile (`apps/mobile`)

The Flutter app for Shoot (شوت), for iOS and Android. This is the **boilerplate only**: the
architecture, tooling, languages and themes are in place, with one small example feature that runs
through every layer. There are no product screens and no sign-in yet; those start with the mobile
spec, once the design is approved.

| | |
|---|---|
| Dart package | `shoot_mobile` |
| Android application id | `ae.shoot.shoot_mobile` |
| iOS bundle id | `ae.shoot.shootMobile` |
| Flutter / Dart | 3.47.9 / 3.13.7 (stable) |
| Platforms | iOS, Android |

The ids come from `flutter create --org ae.shoot`. Change them before the first store upload if the
owner picks a different reverse domain; after that they are permanent.

## Run it

Flutter is its own toolchain. Nothing here uses Node or pnpm, and the pnpm workspace ignores this
folder.

```bash
cd apps/mobile
flutter pub get          # also generates the localizations
flutter run              # pick a simulator, emulator or device
```

The app calls the web app's API. Start the web app from the repo root (`pnpm dev`), then point the
mobile app at it:

```bash
# iOS simulator: localhost is the Mac (the default, no flag needed)
flutter run --dart-define=API_BASE_URL=http://localhost:3000

# Android emulator: the Mac is 10.0.2.2
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000

# A physical phone on the same Wi-Fi: use the Mac's LAN address
flutter run --dart-define=API_BASE_URL=http://192.168.1.20:3000
```

| Define | Default | Meaning |
|---|---|---|
| `API_BASE_URL` | `http://localhost:3000` | Origin of the web app (REST is under `/api`) |
| `APP_ENV` | `development` | `development`, `staging` or `production` |

Plain `http` works only for local development: Android allows it in debug builds only, and iOS
allows it for local-network hosts only. Staging and production must be `https`. Never pass a secret
through `--dart-define`: anything compiled into a mobile app can be read out of it.

## Checks

```bash
flutter analyze          # strict lints, must report no issues
flutter test             # unit, cubit and widget tests
dart format lib test     # formatting (not Prettier)
```

## Architecture

Clean architecture, organised by feature. Dependencies point inward only: presentation depends on
domain, data depends on domain, and domain depends on nothing.

```text
lib/
  main.dart                 entry point: read config, wire DI, run the app
  app.dart                  the shell: language, theme, router
  core/                     shared by every feature, owns no feature logic
    config/                 AppConfig (build-time values from --dart-define)
    di/                     the get_it container and the list of features
    error/                  exceptions (data layer), failures and Result (above it)
    l10n/                   ARB files, locale list and cubit, failure-to-message mapping
    network/                the shared Dio client
    routing/                go_router routes and the not-found screen
    theme/                  semantic colour roles, size/radius/motion tokens, ThemeData
    usecase/                the UseCase contract
    widgets/                widgets used by more than one feature
  features/
    <feature>/
      domain/               pure Dart: no Flutter, no JSON, no HTTP
        entities/           what the app reasons about
        repositories/       contracts (abstract interfaces)
        usecases/           one class per application action
      data/                 everything about where data comes from
        datasources/        HTTP (later: cache, storage); throws exceptions
        models/             wire shapes, fromJson, toEntity
        repositories/       implements the contract; exceptions become failures
      presentation/
        cubit/              state and the cubit that produces it
        pages/              one widget per route
        widgets/            the page's own parts
      <feature>_injection.dart   registers the feature in DI
```

How a call flows, using the example feature (`service_health`, which asks the web app's
`GET /api/health` whether it is up):

```text
ServiceHealthPage -> ServiceHealthCubit -> CheckServiceHealth (use case)
  -> ServiceHealthRepository (contract)  <- ServiceHealthRepositoryImpl
    -> ServiceHealthRemoteDataSource -> Dio -> /api/health
```

The rules that keep the layers honest:

- **Errors.** A datasource throws `NetworkException` or `ServerException`. The repository catches
  them and returns `Result<T>`: `Ok(value)` or `Err(failure)`. Nothing above the data layer sees an
  exception or a Dio type. `Result` and `Failure` are sealed, so a `switch` over them is checked
  for completeness by the compiler.
- **Words.** A `Failure` carries no text. `core/l10n/failure_message.dart` is the one place a
  failure becomes a localized sentence.
- **DI.** Classes take their dependencies through the constructor. Only the composition root
  (`core/di/injection.dart`, `main.dart`, and a page creating its cubit) reads from `getIt`.
- **Imports.** Package imports only (`package:shoot_mobile/...`), enforced by a lint. A feature
  does not import another feature's `data` or `presentation`.

### Packages

Versions are pinned exactly in `pubspec.yaml` (no `^`), like `payload`/`next`/`react` on the web.

| Package | Version | Why |
|---|---|---|
| `flutter_bloc` | 9.1.1 | State management: cubits with explicit, sealed states that are easy to test |
| `get_it` | 9.3.0 | Dependency injection: a plain service locator, no code generation |
| `go_router` | 18.1.4 | Routing: the Flutter team's declarative router, with deep links and URL paths that can mirror the web |
| `dio` | 5.11.1 | HTTP client: interceptors (language header now, auth later), timeouts, typed errors |
| `equatable` | 3.0.0 | Value equality for entities, states and failures without hand-written `==` |
| `intl` + `flutter_localizations` | 0.20.3 / SDK | Localization: ARB files and generated, type-safe `AppLocalizations` |
| `flutter_svg` | 2.3.0 | Icons and scene drawn from the boards' SVG, copied verbatim (feature 007) |
| `shared_preferences` | 2.5.6 | Saves appearance choices on the device (accent, theme mode, language; feature 006) |
| `flutter_secure_storage` | 11.2.0 | The session token lives in the iOS Keychain / Android Keystore (feature 009, FR-023); `shared_preferences` is plain text and hand-written platform channels are more native code to own |
| `url_launcher` | 6.3.3 | Opens the legal documents a person accepts and the website's email sign-in in the browser (feature 009); 012 reuses it for WhatsApp. Hiding the links fails 005's legal rule; a hand-written channel duplicates a first-party package |
| `shared_preferences_platform_interface` (dev) | 2.4.2 | `InMemorySharedPreferencesAsync`, the in-memory store the preference tests run against |
| `bloc_test` (dev) | 10.0.0 | Asserts the sequence of states a cubit emits |
| `mocktail` (dev) | 1.0.5 | Mocks without code generation |
| `flutter_lints` (dev) | 6.0.0 | Base lint set; `analysis_options.yaml` adds the strict rules on top |

There is deliberately no code generation (`build_runner`, `injectable`, `freezed`,
`json_serializable`) and no storage package beyond `shared_preferences` (appearance choices, first-run flags, the install id) and `flutter_secure_storage` (the session token only).
Add one when a spec needs it, with a Complexity Tracking entry in that spec's plan.

## Languages

English is the default and the fallback. Arabic is right-to-left and equal to English, not an
afterthought.

- Every string a person can see or hear is in `lib/core/l10n/arb/app_en.arb` (the template, with a
  description per key) and `app_ar.arb`. No user-visible string literals in Dart.
- `flutter pub get` (or `flutter gen-l10n`) generates `lib/core/l10n/generated/`, which is
  git-ignored. Read strings with `context.l10n.someKey`.
- The app follows the device language until the person picks one with the language button. The
  choice is saved on the device (`appearance.locale`) and applied on the first frame; going back to
  the device language removes it.
- Use directional APIs so Arabic mirrors without per-screen work: `EdgeInsetsDirectional`,
  `AlignmentDirectional`, `PositionedDirectional`, `TextAlign.start`. Never `left`/`right`.
- Every request sends `Accept-Language`, so the API answers in the language on screen.
- Adding a language is a new ARB file plus `CFBundleLocalizations` in `ios/Runner/Info.plist`.

These strings are the app's own interface text, the counterpart of `apps/web/messages/*.json`.
Product copy (audiences, options, contact numbers, prices) is CMS data and must come from the API,
never from an ARB file or a Dart constant.

## Themes

Light and dark are both first-class. The app follows the device until the person picks one.

- `lib/core/theme/shoot_colors.dart` holds the semantic roles (`ground`, `panel`, `panelSolid`,
  `ink`, `mute`, `hair`, `controlBorder`, `tile`, `tileInk`, `accent`, `onAccent`, `accentInk`,
  `selected`, `focus`, `attention`, `success`, `danger` and their `on…` partners), one value per
  theme. Names and values mirror `specs/design-system/tokens.css` (direction "Brief Bar II").
- Accent colour (feature 006): the person picks one of five curated accents (Blue, Teal, Violet,
  Magenta, Graphite; Blue is the default) in the Appearance sheet, opened from the app bar.
  `shoot_accent.dart` holds each accent's seven roles (`accent`, `onAccent`, `accentInk`, `selected`,
  `selectedHover`, `selectionWash`, `focus`) for light and dark; `ShootColors.withAccent(roles)`
  swaps exactly those in, and `AppTheme.of(accent, brightness)` builds (and memoises) the theme.
  Ids are saved on the device and never change once shipped.
- Primary actions use the fixed `primary` / `primaryHover` / `onPrimary` roles (red `#E01414`, same
  in both themes and under every accent), never `accent`. `FilledButton` is wired to them.
- Choices (accent, theme mode, language) are saved through `PreferencesStore`
  (`lib/core/preferences/`, `shared_preferences` underneath) and read before `runApp`, so the first
  frame is already right. Unknown or unreadable values fall back to the defaults silently.
- `shoot_tokens.dart` holds spacing, sizes, radii and the "react" motion durations and curves.
- Widgets read roles, never raw colours: `context.colors.ink`. Stock Material widgets get the same
  roles through the `ColorScheme` built in `app_theme.dart`.
- `test/core/theme/shoot_colors_test.dart` fails if a text role drops below WCAG AA (4.5:1) on its
  surface in either theme; `accent_palette_test.dart` does the same for every accent (text 4.5:1,
  focus ring 3:1) and checks no accent is close to the primary red or the danger state.
- When a token changes on the web, change it here in the same pull request.
- Type (feature 007): `shoot_type.dart` holds the board roles (wordmark, display, title, heading,
  action, row, button, body, chip, meta, badge, group label) with CSS letter-spacing converted to
  pixels and even half-leading, as CSS draws it. `ShootType.num` adds tabular figures.
- Graphic colours (scene, sweep, corner glow, glint, pulse) are the `ShootScene` theme extension
  (`context.scene`); shadows are `ShootShadows` built with `cssShadow`, which converts a CSS blur to
  Flutter's; `css_gradient.dart` paints CSS linear and radial gradients on any box.
  `tokens_parity_test.dart` fails if any colour in `tokens.css` differs from its Dart role.
- Motion (`lib/core/motion/`): the react tier in `shoot_tokens.dart`; the arrive tier (`Rise`,
  `stagger`, `FocusIn`, `Roll`, `DrawCheck`, `Grow`, `Deal`, `WriteIn`, `Shake`, the Top Hit
  `Glint`) plays once; the ambient tier (`Ambient`) loops only under an `AmbientPause` with its
  Pause control. Every self-started animation ends within 5 s (`MotionPolicy.selfStartedBudget`),
  and with reduced motion every widget shows its finished state on the first frame.

## Widgets and the gallery

Every screen is built from `lib/core/widgets/`, one widget per board class (the catalogue is
`specs/007-mobile-foundation/contracts/component-catalogue.md`). `lib/core/gallery/catalogue.dart`
lists each component with its states; the debug-only gallery at `/_gallery` shows them with
language and theme switches, and the RTL, large-text, semantics and component-golden tests walk
the same list. A widget holds no copy: text comes in through parameters.

## Design fidelity

Each screen is proven against its canvas board (`specs/design-system/canvas/`), pixel by pixel.

```bash
tool/goldens.sh             # golden tests (macOS with Flutter 3.47.9 only); fails on any change
tool/goldens.sh --update    # rewrite the app's goldens after a deliberate change
pnpm fidelity               # (repo root) render the boards, compare every shipped screen's goldens
pnpm fidelity:report        # open the report: side-by-side and overlay per screen and variant
```

- Goldens are made and checked on macOS only, with the pinned Flutter, by `tool/goldens.sh` and
  the macOS CI job; a plain `flutter test` skips them.
- Text is drawn with the vendored test fonts (`test/fonts/`, Roboto and Noto Sans Arabic); the app
  itself ships no font.
- The gates: at most 1 % of pixels differ (2 % on text-heavy boards) and every key element is
  within 1 px. Calibration on screens 37 and 39: 0.12 % to 0.31 %.

## Add a feature

Work through the layers from the inside out, test first. `service_health` is the template; copy
its shape, not its content.

1. **Spec first.** The repo is spec-driven: the feature needs a spec, plan and tasks before code.
2. **Domain.** In `lib/features/<feature>/domain/`, add the entity, the repository contract and one
   use case per action. Pure Dart only. Write the use-case test first.
3. **Data.** Add the model (`fromJson`, `toEntity`), the datasource (throws exceptions) and the
   repository implementation (returns `Result`). Test the repository with a mocked datasource and
   the datasource with a stubbed Dio adapter.
4. **Presentation.** Add sealed states and a cubit that calls the use case. Test it with
   `bloc_test`. Then the page: a `…Page` that creates the cubit and a `…View` that renders it, so
   the widget test can supply any state. Test it in English and in Arabic.
5. **Strings.** Add every string to both ARB files, with a description in `app_en.arb`.
6. **Wire it.** Add `<feature>_injection.dart`, call it from `core/di/injection.dart`, and add the
   route in `core/routing/app_router.dart`.
7. **Build to the board.** Assemble the screen from catalogue widgets, add a
   `ValueKey('fidelity:<box>')` for every box the manifest names, write
   `test/goldens/screens/<id>_<name>_golden_test.dart` (four variants and self-baselines), run
   `tool/goldens.sh --update`, and add the feature to `tools/design-fidelity/shipped.json`.
8. **Check.** `flutter analyze`, `flutter test`, `tool/goldens.sh` and `pnpm fidelity` pass, and
   the screen is verified in English and Arabic, light and dark, on a small phone.

Remove `service_health` once the first real feature has replaced it as the home route.

## Not done yet

- Sign-in (UAE mobile number + OTP) is not specified, so nothing here authenticates.
- The home-screen name is "Shoot" on iOS in every language (Android shows "شوت" in Arabic). The
  Arabic name on iOS needs an `InfoPlist.strings` added in Xcode.
- App icon and launch screen are the Flutter defaults.
- The CI job `mobile` exists; branch protection must require it.
- Arabic references for the fidelity check wait for the designer's Arabic dark boards
  (`specs/007-mobile-foundation/designer-request.md`).
- No flavors (separate dev/staging/production apps); `APP_ENV` is a build-time value only.
