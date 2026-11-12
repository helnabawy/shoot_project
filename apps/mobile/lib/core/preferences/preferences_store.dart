/// The seam between the appearance cubits and the device's key-value store.
///
/// Reads are synchronous (the store is loaded before `runApp`, so the first
/// frame is already right) and never throw. Writes are asynchronous and never
/// throw to the caller: a failed write is logged in debug builds only, and the
/// choice still applies for the session (FR-012).
abstract interface class PreferencesStore {
  /// The saved string, or `null` when missing, of the wrong type or unreadable.
  String? readString(String key);

  Future<void> writeString(String key, String value);

  Future<void> remove(String key);
}

/// The keys the app saves. Part of the on-device data format: renaming one
/// loses everyone's saved choice, so a rename needs a migration step.
abstract final class PreferenceKeys {
  static const accent = 'appearance.accent';
  static const themeMode = 'appearance.themeMode';
  static const locale = 'appearance.locale';

  /// `true` once the person has seen the welcome steps (feature 007, FirstRunStore).
  static const welcomeSeen = 'firstRun.welcomeSeen';

  /// The anonymous install id sent as `X-Shoot-Install` (feature 008, InstallIdStore).
  static const installId = 'install.id';

  /// `true` once this install has started; its absence means a fresh install, and the secure
  /// store (which survives an uninstall on iOS) is wiped (feature 009, SecureSessionStore).
  static const installSeen = 'install.seen';

  /// `true` while the landing's loops are paused (feature 010, `LandingMotionStore`).
  static const landingMotionPaused = 'landing.motionPaused';

  static const all = {
    accent,
    themeMode,
    locale,
    welcomeSeen,
    installId,
    installSeen,
    landingMotionPaused,
  };
}
