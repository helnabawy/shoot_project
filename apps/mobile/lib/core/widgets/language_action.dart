import 'package:flutter/widgets.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shoot_mobile/core/l10n/app_locales.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/l10n/locale_cubit.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon_button.dart';

/// The header's language switch (`.ib`, text): the other language's name, in that language.
class LanguageAction extends StatelessWidget {
  const LanguageAction({super.key, this.square = false});

  /// See [ShootTextAction.square].
  final bool square;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final isArabic = Localizations.localeOf(context).languageCode == 'ar';
    return ShootTextAction(
      text: l10n.languageSwitchAction,
      label: l10n.languageSwitchTooltip,
      square: square,
      onPressed: () => context.read<LocaleCubit>().select(
        isArabic ? AppLocales.english : AppLocales.arabic,
      ),
    );
  }
}
