import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/routing/app_routes.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/widgets/empty_state.dart';
import 'package:shoot_mobile/core/widgets/language_action.dart';
import 'package:shoot_mobile/core/widgets/shoot_header.dart';
import 'package:shoot_mobile/core/widgets/shoot_row.dart';
import 'package:shoot_mobile/core/widgets/shoot_scaffold.dart';
import 'package:shoot_mobile/core/widgets/top_hit.dart';
import 'package:shoot_mobile/core/widgets/wordmark.dart';
import 'package:shoot_mobile/features/content/presentation/widgets/content_icons.dart';

/// Screen 38, built to board `S10b-removed`: a page or guide that was deleted. Worded differently
/// from not found (37); it says it used to be here and offers the guides, WhatsApp and the one
/// primary action, "Start a brief".
class RemovedPage extends StatelessWidget {
  const RemovedPage({super.key, required this.onWhatsapp});

  /// Opens WhatsApp with the default message.
  final VoidCallback onWhatsapp;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final rows = [
      (ContentIcons.book, l10n.removedGuides, () => context.go('/guides')),
      (ContentIcons.whatsapp, l10n.errorWhatsapp, onWhatsapp),
    ];
    return ShootScaffold(
      child: Column(
        children: [
          ShootHeader(
            leading: Wordmark(
              label: l10n.appTitle,
              onTap: () => context.go(AppRoutes.home),
            ),
            trailing: const [LanguageAction()],
          ),
          Expanded(
            child: Center(
              child: Padding(
                padding: const EdgeInsetsDirectional.symmetric(
                  horizontal: ShootSpace.s8,
                ),
                child: EmptyState(
                  mark: const ContentTile.big(ContentIcons.trash),
                  meta: l10n.removedCode,
                  title: l10n.removedTitle,
                  titleKey: const ValueKey('fidelity:h1'),
                  body: l10n.removedBody,
                  bodyMaxWidth: 270,
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsetsDirectional.fromSTEB(20, 0, 20, 18),
            child: Column(
              children: [
                Semantics(
                  container: true,
                  explicitChildNodes: true,
                  label: l10n.notFoundNextLabel,
                  child: Column(
                    children: [
                      for (final (i, (icon, label, onTap)) in rows.indexed)
                        ShootRow(
                          leading: ContentTile(icon),
                          label: label,
                          onTap: onTap,
                          divider: i == rows.length - 1
                              ? RowDivider.topAndBottom
                              : RowDivider.top,
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: ShootSpace.s5),
                TopHit(
                  label: l10n.notFoundAction,
                  chevron: true,
                  onPressed: () => context.go(AppRoutes.home),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
