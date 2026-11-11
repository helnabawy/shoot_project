# Data model: Mobile accent colour setting

All of this lives in the mobile app (`apps/mobile`). Nothing is stored on a server.

## ShootAccent (curated option, code constant)

| Field | Type | Rules |
|---|---|---|
| `id` | string | Stable, lower-case, `[a-z]+`. Saved in preferences, so it never changes or gets reused once shipped. Values: `blue`, `teal`, `violet`, `magenta`, `graphite`. |
| `order` | int | Position in the list; Blue is 0. |
| name | localised string | From the ARB files (`accentBlue`, `accentTeal`, …), English and Arabic. Not stored with the accent. |
| `light` | AccentRoles | Values for the light theme. |
| `dark` | AccentRoles | Values for the dark theme. |

Invariants (checked by tests):
- Exactly one accent is the default, and it is `blue` with today's values (FR-002, SC-005).
- Ids are unique (MA-US2-S3 relies on lookup by id).
- Every accent passes the contrast pairs in FR-007 in both themes (MA-US3-S1).
- Every chromatic accent's `accent`, `selected` and `focus` hues are at least 30° from the hue of `primary` and of `onDanger` (the danger text colour) in the same theme; an achromatic accent (saturation below 10%) is exempt (MA-US3-S2, FR-008).

## AccentRoles (per accent, per theme)

| Role | Meaning | Constraint |
|---|---|---|
| `accent` | Fill: selected glyph tile, chips, progress, caret, selection handles | `onAccent` on it ≥ 4.5:1 |
| `onAccent` | Glyphs and text on `accent` | white, or dark ink when the fill is light (Graphite dark) |
| `accentInk` | Accent as text: selected-row labels, links | ≥ 4.5:1 on ground, panel-solid, and on `selected` / `selectedHover` flattened over each |
| `selected` | Selected row tint (translucent) | see `accentInk` |
| `selectedHover` | Selected row pressed / hovered (translucent) | see `accentInk` |
| `selectionWash` | Text-selection highlight (translucent) | none (decorative) |
| `focus` | Focus ring | ≥ 3:1 against ground and panel-solid |

## ShootColors changes

- New fixed roles, same in both themes and untouched by any accent: `primary` #E01414, `primaryHover` #C00F0F, `onPrimary` #FFFFFF.
- `withAccent(AccentRoles)` returns a copy with the seven accent roles replaced.

## AppearancePreferences (saved on the device)

| Key | Value | Default when missing or invalid |
|---|---|---|
| `appearance.accent` | an accent `id` | `blue` |
| `appearance.themeMode` | `system` \| `light` \| `dark` | `system` |
| `appearance.locale` | `en` \| `ar`; absent means follow the device | follow the device (`AppLocales.resolve`) |

Rules:
- A value of the wrong type, an unknown id or an unsupported language code is treated as missing (FR-011); it is not rewritten until the person makes a new choice.
- Writes happen on each choice; a failed write leaves the in-memory state as chosen and raises nothing to the UI (FR-012).

## State (cubits)

| Cubit | State | Initial state | Transition |
|---|---|---|---|
| `AccentCubit` (new) | `ShootAccent` | saved accent, else `blue` | `select(accent)`: emit, then save |
| `ThemeModeCubit` | `ThemeMode` | saved mode, else `system` | `select(mode)`: emit, then save |
| `LocaleCubit` | `Locale?` | saved locale, else `null` (device) | `select(locale)`: emit, then save (null removes the key) |

The emit comes before the save so the UI never waits on storage.
