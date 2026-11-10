import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shoot_mobile/core/l10n/app_locales.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/l10n/locale_cubit.dart';
import 'package:shoot_mobile/core/theme/theme_mode_cubit.dart';

/// Switches between the two languages. Its label is the other language's
/// name in that language ("العربية" / "English"), like the web header.
/// With a third language this becomes a menu.
class LanguageButton extends StatelessWidget {
  const LanguageButton({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final isArabic = Localizations.localeOf(context).languageCode == 'ar';
    return Tooltip(
      message: l10n.languageSwitchTooltip,
      excludeFromSemantics: true,
      child: Semantics(
        button: true,
        label: l10n.languageSwitchTooltip,
        excludeSemantics: true,
        child: TextButton(
          onPressed: () => context.read<LocaleCubit>().select(
            isArabic ? AppLocales.english : AppLocales.arabic,
          ),
          child: Text(l10n.languageSwitchAction),
        ),
      ),
    );
  }
}

/// Light / dark / match device.
class ThemeMenuButton extends StatelessWidget {
  const ThemeMenuButton({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final current = context.watch<ThemeModeCubit>().state;
    String label(ThemeMode mode) => switch (mode) {
      ThemeMode.system => l10n.themeSystem,
      ThemeMode.light => l10n.themeLight,
      ThemeMode.dark => l10n.themeDark,
    };
    return PopupMenuButton<ThemeMode>(
      tooltip: l10n.themeMenuTooltip,
      icon: const Icon(Icons.contrast),
      initialValue: current,
      onSelected: context.read<ThemeModeCubit>().select,
      itemBuilder: (context) => [
        for (final mode in ThemeMode.values)
          CheckedPopupMenuItem<ThemeMode>(
            value: mode,
            checked: mode == current,
            child: Text(label(mode)),
          ),
      ],
    );
  }
}
