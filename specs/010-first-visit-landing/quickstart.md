# Quickstart: verifying feature 010

```bash
cd apps/mobile && dart format --set-exit-if-changed lib test && flutter analyze && flutter test
tool/goldens.sh                      # macOS, pinned Flutter 3.47.9; --update only for the app's own goldens
cd ../.. && pnpm --filter @shoot/domain test && pnpm typecheck
```

Manual: fresh install, splash, three steps, landing; build a brief; menu language, theme, WhatsApp;
Pause persists after relaunch; with reduced motion the page is still.

Scenario ids `ML-US1-S1` to `ML-US4-S8` map to test names that start with the id; find them with
`grep -rn "ML-US" apps/mobile/test`.
