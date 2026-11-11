# Contract: PreferencesStore (app-internal)

The seam between the three appearance cubits and the device's key-value store. Internal to `apps/mobile`; no other app or service reads it. Covers FR-009 to FR-013.

## Interface

```text
PreferencesStore
  readString(key)  -> string or nothing      synchronous; never throws (wrong type or unreadable -> nothing)
  writeString(key, value) -> completes        asynchronous; never throws to the caller (failures are swallowed, logged in debug)
  remove(key)      -> completes               same failure rule as writeString
```

## Implementations

| Implementation | Where | Notes |
|---|---|---|
| `SharedPreferencesStore` | `lib/core/preferences/` | Wraps the plugin's cached API, created once in `main()` before `runApp`, cache restricted to the three keys below. |
| `InMemoryPreferencesStore` | `test/helpers/` | Seeded map; can be told to fail reads or writes, for MA-US2-S4 and the FR-012 edge case. |

## Keys

| Key | Written by | Values |
|---|---|---|
| `appearance.accent` | `AccentCubit` | accent id |
| `appearance.themeMode` | `ThemeModeCubit` | `system`, `light`, `dark` |
| `appearance.locale` | `LocaleCubit` | `en`, `ar`; removed when the person goes back to the device language |

Keys are part of the app's on-device data format: renaming one loses everyone's saved choice, so a rename needs a migration step in the store.
