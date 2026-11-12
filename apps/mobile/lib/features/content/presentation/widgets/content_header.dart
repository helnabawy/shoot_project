import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/routing/app_routes.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/widgets/language_action.dart';
import 'package:shoot_mobile/core/widgets/shoot_header.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon_button.dart';
import 'package:shoot_mobile/core/widgets/wordmark.dart';
import 'package:shoot_mobile/features/content/presentation/widgets/content_icons.dart';

/// The 58 px header of the content screens. The default has the wordmark, the language action, the
/// account and the menu (boards 33, 35, 36); [ContentHeader.back] has a back button and the language
/// action (board 34).
class ContentHeader extends StatelessWidget {
  const ContentHeader({super.key}) : backLabel = null, onBack = null;

  const ContentHeader.back({
    super.key,
    required String this.backLabel,
    required VoidCallback this.onBack,
  });

  final String? backLabel;
  final VoidCallback? onBack;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final back = onBack;
    if (back != null) {
      return ShootHeader(
        leadsWithBack: true,
        leading: ShootIconButton(
          icon: ShootIcons.back,
          label: backLabel!,
          onPressed: back,
        ),
        // Back, the wordmark between, and the language: three items, `space-between` (board 34).
        middle: Wordmark(
          label: l10n.appTitle,
          onTap: () => context.go(AppRoutes.home),
        ),
        trailing: const [LanguageAction(square: true)],
      );
    }
    return ShootHeader(
      // At the largest text size the wordmark gives way to the three actions.
      leading: Flexible(
        child: FittedBox(
          fit: BoxFit.scaleDown,
          alignment: AlignmentDirectional.centerStart,
          child: Wordmark(
            label: l10n.appTitle,
            onTap: () => context.go(AppRoutes.home),
          ),
        ),
      ),
      trailing: [
        const LanguageAction(),
        const SizedBox(width: 2),
        ShootIconButton(
          icon: ShootIcons.person,
          label: l10n.contentAccount,
          onPressed: () => context.push(AppRoutes.login),
        ),
        const SizedBox(width: 2),
        _MenuButton(
          label: l10n.contentMenu,
          onPressed: () => context.push('/menu'),
        ),
      ],
    );
  }
}

class _MenuButton extends StatelessWidget {
  const _MenuButton({required this.label, required this.onPressed});

  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: label,
      onTap: onPressed,
      excludeSemantics: true,
      child: Material(
        type: MaterialType.transparency,
        child: InkWell(
          onTap: onPressed,
          borderRadius: BorderRadius.circular(ShootRadius.row),
          child: SizedBox.square(
            dimension: ShootSize.iconButton,
            child: Center(
              child: ContentIcon(
                ContentIcons.menu,
                size: 20,
                strokeWidth: 2,
                color: context.colors.ink,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
