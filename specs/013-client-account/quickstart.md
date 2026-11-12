# Quickstart: Mobile client account

Prereqs: Node 24, Docker, Flutter (pinned). `docker compose up -d postgres && pnpm db:migrate && pnpm seed`.

Scenarios, each with a test named by its id:
- MK-US1-S1..S7 account home (domain `up-next`, handler, cubit, widget, golden 24).
- MK-US2-S1..S6 bookings (domain split, handler, cubit, widget, golden 26).
- MK-US3-S1..S8 finish (domain checklist, `PATCH me`, cubit, widget, golden 25).
- MK-US4-S1..S2 log out; S3 blocked on FR-031.

Run: `pnpm --filter @shoot/domain test`, `pnpm --filter web test`, in `apps/mobile` `flutter test`, `pnpm check:scenarios`.
