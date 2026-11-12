# Data model: Mobile creators

Entities already exist in `features/creators/domain/entities/creators.dart` and
`core/content/creator_card.dart` (008). New, in this feature (pure Dart):

- **DirectoryState** (cubit state): `status` (loading, ready, failure, loadingMore), `query`
  (`CreatorQuery` without page), `items` (accumulated cards), `filters`, `pagination` (last page
  loaded), `failure`. `shown` = items.length, `total` = pagination.total, `canMore` =
  pagination.hasNext. Changing a filter resets items and page.
- **ProfileState**: loading | ready(`CreatorProfile`) | notFound | failure.
- **SpecialtyState**: loading | ready(page, `place`) | notFound | failure; derived `creators`,
  `samples`, `sampleCount`, `professionalCount` for the chosen place, `places` (union).
- **HireState**: loading | ready(`HirePage`, expanded question) | notFound | failure.
- **BriefAnswers** (`domain/brief/brief_rules.dart`): `values` by slot token; rules
  `restrictedOptions(slot, creator)`, `applyPreset(config, preset)` (drops values that are not an
  option), `nextOpenSlot`, `isComplete`, `sentenceParts`, `whatsappMessage`.
- **BriefState**: config, answers, open slot, `creator` (code, name, first name, personaSlugs,
  places) or null.

Validation: `isComplete` = every `required` slot has a value that is one of its (restricted)
options, or a custom text when `allowCustom`. A 404 maps to `notFound`.
