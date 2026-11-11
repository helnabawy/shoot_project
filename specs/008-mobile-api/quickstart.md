# Quickstart: Mobile API

How to prove feature 008 works.

- Shapes: [data-model.md](data-model.md).
- Endpoints, access and problems: [contracts/mobile-api.md](contracts/mobile-api.md).
- Handler rules: [contracts/handler.md](contracts/handler.md).

## Prerequisites

- Node 24 and pnpm (`nvm use`), and Docker for the integration tests and local PostgreSQL.
- Features 001, 002, 003 and 005 merged (the queries this API wraps).
- Flutter 3.47.2 and Dart 3.13.2 for the app side. Feature 006 (`PreferencesStore`) and 007
  (`SceneTile`, scenario check over Dart tests) merged.
- For the app-link manual checks: an iPhone simulator, an Android emulator, and a staging host with
  HTTPS.

## Automated checks

From the repository root:

```bash
pnpm install
pnpm --filter @shoot/domain test:coverage   # schemas, examples, rich text, resolve, app links, compat, snapshot; 100 %
pnpm typecheck && pnpm lint
pnpm --filter web test                      # unit (mappers, negotiate, problems, codes) + integration (mobile-api-*.int.test.ts)
pnpm check:scenarios                        # includes specs/008-mobile-api/quickstart.md
pnpm --filter web build && pnpm --filter web test:e2e -- mr-smoke
```

In `apps/mobile`:

```bash
dart format --set-exit-if-changed lib test
flutter analyze                             # no issues
flutter test --coverage                     # models decode every example; repositories; interceptors; ShootImage; app-link config
```

Expected results:
- every endpoint answers in `en` and `ar` with a body that parses with its schema;
- the snapshot test reports "no change";
- `api:snapshot` is not needed unless a shape changed.

### Try it by hand

```bash
docker compose up -d postgres && pnpm db:migrate && pnpm seed && pnpm dev
curl -s localhost:3000/api/mobile/v1/site -H 'Accept-Language: ar' -D - | head -20
curl -s 'localhost:3000/api/mobile/v1/creators?page=1' | jq '.items[0]'
curl -s 'localhost:3000/api/mobile/v1/resolve?path=/ar/does-not-exist'   # {"status":"notFound",…,"locale":"ar"}
curl -s 'localhost:3000/api/mobile/v1/site?locale=fr'                     # 422 problem, fields[0].code = api.errors.localeUnsupported
curl -s localhost:3000/api/mobile/v9/anything                             # 404 problem
APP_IOS_APP_IDS=ABCDE12345.ae.shoot.app pnpm dev
curl -s localhost:3000/.well-known/apple-app-site-association
```

Check the headers:
- public answers carry `Cache-Control: public, s-maxage=60`, `Vary: Accept-Language` and
  `Content-Language`;
- problems carry `no-store`.

### Changing a shape

1. Edit the schema in `packages/domain/src/api/v1/` and its example(s).
2. Run `pnpm --filter @shoot/domain test`. A breaking change fails and names the endpoint and
   JSON pointer: make it additive, or plan v2.
3. Run `pnpm --filter @shoot/domain api:snapshot`, then commit `specs/contracts/mobile-api/v1.schema.json`
   with the change.
4. Update the Dart model and run `flutter test`. The same example must decode.

## Manual checks

1. Edit the WhatsApp number in `/admin` and wait 60 s. `GET /site` returns the new number, with no
   deploy.
2. Add a persona and add it to Site Settings' active personas. `GET /personas` lists it in order.
   Switch it off and it disappears.
3. Leave an article untranslated. `GET /guides/{slug}` in Arabic returns English text with
   `inRequestedLanguage: false`.
4. On staging, with `APP_IOS_APP_IDS`, `APP_ANDROID_PACKAGE` and `APP_ANDROID_CERT_SHA256` set:
   - Apple's AASA validator and Google's Digital Asset Links tester accept the files (SC-007);
   - on Android, `adb shell pm get-app-links <package>` shows the host `verified`;
   - on the iPhone simulator, `xcrun simctl openurl booted https://<staging>/creators/<code>` opens the
     app; on Android, `adb shell am start -a android.intent.action.VIEW -d https://<staging>/ar/guides`
     opens the app.

   Until 010–015 build the screens, the app shows screen 37 for these paths (007), which is
   expected.
5. Open `https://<staging>/how-it-works`, an editor page at the root. It opens in the browser, as
   designed (spec Assumptions).
6. Check the size of the first page of `GET /creators` with `curl -s --compressed -o /dev/null -w
   '%{size_download}'`. It is ≤ 100 KB (SC-006).

## Scenario → test mapping (Principle III)

Test names start with the id in the first column. Dart paths are repo-relative; other bare file
names are found under `apps/web` and `packages/domain`.

| Id | Layer | Test file |
|----|-------|-----------|
| MR-US1-S1 site settings come back as edited; the change shows on the next read | integration, Dart | `mobile-api-site.int.test.ts`, `apps/mobile/test/features/site/data/repositories/site_repository_impl_test.dart` |
| MR-US1-S2 Arabic answers, with English for untranslated fields | integration, Dart | `mobile-api-site.int.test.ts`, `apps/mobile/test/features/site/data/models/site_models_test.dart` |
| MR-US1-S3 an explicit locale wins over the header; an unsupported one is a 422 with a field code | unit, integration | `apps/web/src/shared/api/negotiate.test.ts`, `mobile-api-site.int.test.ts` |
| MR-US1-S4 only active personas, in site order, with their categories | unit, integration | `apps/web/src/modules/personas/wire.test.ts`, `mobile-api-site.int.test.ts` |
| MR-US1-S5 brief builder steps and landing sections in CMS order, resolved | unit, integration, Dart | `domain/api/v1/landing.test.ts`, `apps/web/src/modules/landing/wire.test.ts`, `mobile-api-site.int.test.ts`, `apps/mobile/test/core/content/sections_model_test.dart` |
| MR-US1-S6 internal settings never appear | unit, integration | `apps/web/src/modules/site-settings/wire.test.ts`, `domain/api/v1/snapshot.test.ts`, `mobile-api-site.int.test.ts` |
| MR-US2-S1 an additive change passes and is recorded | unit | `domain/api/v1/compat.test.ts`, `domain/api/v1/snapshot.test.ts` |
| MR-US2-S2 a breaking change fails and names the endpoint and field | unit | `domain/api/v1/compat.test.ts` |
| MR-US2-S3 every example is valid on the server and decodes in the app | unit, Dart | `domain/api/v1/examples.test.ts`, `apps/mobile/test/api_examples_test.dart` |
| MR-US2-S4 every problem code has English and Arabic words, web and app | unit, Dart | `apps/web/tests/unit/problem-codes.test.ts`, `apps/mobile/test/core/l10n/failure_message_test.dart` |
| MR-US2-S5 an unknown enum value or field does not break decoding | Dart | `apps/mobile/test/core/network/forward_compat_test.dart` |
| MR-US2-S6 failures are problem documents with codes, no detail, logged without PII | unit, integration, Dart | `apps/web/src/shared/api/problem.test.ts`, `mobile-api-handler.int.test.ts`, `apps/mobile/test/core/network/api_get_test.dart` |
| MR-US2-S7 declared access is enforced; unknown API addresses answer a 404 problem; every 008 endpoint is public | integration | `mobile-api-handler.int.test.ts`, `mobile-api-access.int.test.ts` |
| MR-US2-S8 limits count per install id, else per address | unit, integration, Dart | `apps/web/src/shared/api/negotiate.test.ts`, `mobile-api-handler.int.test.ts`, `apps/mobile/test/core/network/install_id_interceptor_test.dart`, `apps/mobile/test/core/install/install_id_store_test.dart` |
| MR-US3-S1 the directory lists listed creators only, in order, with filters and pages | unit, integration, Dart | `apps/web/src/modules/creators/wire.test.ts`, `mobile-api-creators.int.test.ts`, `apps/mobile/test/features/creators/data/repositories/creators_repository_impl_test.dart` |
| MR-US3-S2 a profile by any spelling of the code; unknown or suspended is not found | integration, Dart | `mobile-api-creators.int.test.ts`, `apps/mobile/test/features/creators/data/repositories/creators_repository_impl_test.dart` |
| MR-US3-S3 a specialty page with text, counts, creators and samples | integration | `mobile-api-creators.int.test.ts` |
| MR-US3-S4 a hire page with preset, up to six creators and FAQ; a renamed one gives its current path | integration, Dart | `mobile-api-creators.int.test.ts`, `apps/mobile/test/features/creators/data/models/creator_models_test.dart` |
| MR-US3-S5 images are absolute with sizes; the app picks the smallest size that is wide enough | unit, Dart | `domain/api/v1/common.test.ts`, `apps/web/src/shared/api/wire.test.ts`, `apps/mobile/test/core/widgets/shoot_image_test.dart` |
| MR-US3-S6 no photo or a failed load shows the scene tile | Dart | `apps/mobile/test/core/widgets/shoot_image_test.dart` |
| MR-US4-S1 the guide list by page, category and author; scheduled guides hidden until their time | integration | `mobile-api-content.int.test.ts` |
| MR-US4-S2 rich text as a node tree; site links as paths; unsafe links as plain text | unit, integration, Dart | `domain/api/v1/richtext.test.ts`, `domain/content/links.test.ts`, `mobile-api-content.int.test.ts`, `apps/mobile/test/core/content/rich_text_model_test.dart` |
| MR-US4-S3 an untranslated article comes in English, marked | integration | `mobile-api-content.int.test.ts` |
| MR-US4-S4 an editor page by either language's address; drafts not found; renamed gives its current path | integration | `mobile-api-content.int.test.ts` |
| MR-US4-S5 legal current version, version list and one version | integration, Dart | `mobile-api-content.int.test.ts`, `apps/mobile/test/features/content/data/repositories/content_repository_impl_test.dart` |
| MR-US5-S1 resolve answers "page" with kind, current path and locale | unit, integration | `domain/api/v1/resolve.test.ts`, `mobile-api-resolve.int.test.ts` |
| MR-US5-S2 a renamed or other-language address resolves to the current path | integration | `mobile-api-resolve.int.test.ts` |
| MR-US5-S3 removed and never-existing addresses | integration, Dart | `mobile-api-resolve.int.test.ts`, `apps/mobile/test/features/links/data/repositories/links_repository_impl_test.dart` |
| MR-US5-S4 private paths are classified without a lookup | unit, integration | `domain/api/v1/resolve.test.ts`, `mobile-api-resolve.int.test.ts` |
| MR-US5-S5 association files at fixed addresses, not proxied; not found when unconfigured | unit, integration | `domain/api/v1/app-links.test.ts`, `apps/web/src/proxy.test.ts`, `mobile-api-app-links.int.test.ts` |
| MR-US5-S6 iOS and Android declare the same link paths; Android verifies | unit, Dart | `domain/api/v1/app-links.test.ts`, `apps/mobile/test/core/routing/app_links_config_test.dart` |
| MR-SC-001 smoke on the built app: site, creators, resolve and both association files parse | e2e | `mr-smoke.spec.ts` |
