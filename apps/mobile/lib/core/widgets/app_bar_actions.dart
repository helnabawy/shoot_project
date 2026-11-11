import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shoot_mobile/core/l10n/app_locales.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/l10n/locale_cubit.dart';
import 'package:shoot_mobile/core/widgets/appearance_sheet.dart';

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

/// Opens the Appearance sheet (theme and accent colour).
class AppearanceButton extends StatelessWidget {
  const AppearanceButton({super.key = const Key('appearance-button')});

  @override
  Widget build(BuildContext context) {
    final label = context.l10n.appearanceButtonTooltip;
    return IconButton(
      tooltip: label,
      icon: const Icon(Icons.contrast),
      onPressed: () => unawaited(showAppearanceSheet(context)),
    );
  }
}
