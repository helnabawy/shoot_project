import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/l10n/locale_cubit.dart';
import 'package:shoot_mobile/core/theme/theme_mode_cubit.dart';
import 'package:shoot_mobile/features/account/domain/entities/account.dart';

/// The device's language and theme (feature 006), the fourth item of the checklist (FR-021).
/// They are never stored in the account (spec assumptions).

/// "English · auto": the language in use and whether the theme follows the device.
String prefsStatus(BuildContext context) {
  final l10n = context.l10n;
  final locale = context.watch<LocaleCubit>().state;
  final mode = context.watch<ThemeModeCubit>().state;
  final arabic =
      (locale ?? Localizations.localeOf(context)).languageCode == 'ar';
  return l10n.accountPrefsStatus(
    arabic ? l10n.accountLanguageArabic : l10n.accountLanguageEnglish,
    switch (mode) {
      ThemeMode.system => l10n.accountThemeAuto,
      ThemeMode.light => l10n.accountThemeLight,
      ThemeMode.dark => l10n.accountThemeDark,
    },
  );
}

/// The item counts as done once the person has chosen a language or a theme on this device.
bool prefsDone(BuildContext context) =>
    context.watch<LocaleCubit>().state != null ||
    context.watch<ThemeModeCubit>().state != ThemeMode.system;

/// How many of the four items are done, and how many there are.
({int done, int total}) finishProgress(BuildContext context, AccountHome home) {
  final prefs = prefsDone(context);
  return (
    done: home.finishItems.where((i) => i.done).length + (prefs ? 1 : 0),
    total: home.finishItems.length + 1,
  );
}
