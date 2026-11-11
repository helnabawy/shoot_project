# Local API v1 fixtures (temporary)

Stand-ins for the shared examples in `packages/domain/src/api/v1/examples/`, written from the
shapes in `specs/008-mobile-api/contracts/mobile-api.md` while the web side (T001–T022) is built on
another branch. After the merge, point `test/helpers/api_fixture.dart` at the shared examples and
delete this folder (the names match: `problem-422.json`, `problem-404.json`; `image.json` becomes
the logo of `site.json`).
