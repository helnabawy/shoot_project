# Quickstart: validating the creator account

Prerequisites: Node 24 (`nvm use`), Docker, `docker compose up -d postgres`, pinned Flutter.

1. `pnpm --filter @shoot/domain test`: schemas and examples (`MW-` contract tests).
2. `pnpm --filter web test`: handler and command tests, including integration (Testcontainers).
3. `pnpm typecheck && pnpm check:scenarios`.
4. `cd apps/mobile && dart format --set-exit-if-changed lib test && flutter analyze && flutter test`.
5. Manual: `pnpm dev`, `pnpm seed`, `pnpm --filter web otp:last` for the code; sign in as a creator in the
   app; walk MW-US1 (fill steps, send), MW-US2 (confirm, decline), MW-US4 (block days).
6. Goldens (macOS, pinned Flutter): `apps/mobile/tool/goldens.sh`, then `pnpm fidelity`.
