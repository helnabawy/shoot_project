# Data model: Mobile first visit and landing

## Device
- `firstRun.welcomeSeen` = "true": learning steps seen (exists, `FirstRunStore`).
- `landing.motionPaused` = "true" or absent: Pause choice (new).
- Half-built brief: memory only (`BriefCubit`).

## App entities (`features/brief/domain/`)
- `BriefAnswer { token, value, label, custom }`.
- `BriefDraft { answers: token -> List<BriefAnswer>, date }`; derived: `nextStep(config)`,
  `visibleOptions(slot)` (filtered by chosen persona slugs), `isComplete`.
- `BriefReceipt { reference, sentence, whatsappUrl, matchPath? }`.
- Failures: `OptionGoneFailure(token)`, `RateLimitFailure`, plus the shared failures.

## Server
Reuses `briefs` (persona[], selections[], date, sentence, locale, `sourcePath = /app/landing`,
fingerprint). No schema change, no migration.
