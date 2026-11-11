import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/routing/app_routes.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/widgets/empty_state.dart';
import 'package:shoot_mobile/core/widgets/icon_tile.dart';
import 'package:shoot_mobile/core/widgets/language_action.dart';
import 'package:shoot_mobile/core/widgets/shoot_header.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';
import 'package:shoot_mobile/core/widgets/shoot_row.dart';
import 'package:shoot_mobile/core/widgets/shoot_scaffold.dart';
import 'package:shoot_mobile/core/widgets/top_hit.dart';
import 'package:shoot_mobile/core/widgets/wordmark.dart';

/// Screen 37, built to board `S10-not-found`: shown for an unknown link, or one whose screen is not
/// built yet, in the link's language.
class NotFoundPage extends StatelessWidget {
  const NotFoundPage({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
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
                  mark: const IconTile.large(ShootIcons.searchQuestion),
                  meta: l10n.notFoundCode,
                  title: l10n.notFoundTitle,
                  titleKey: const ValueKey('fidelity:h1'),
                  body: l10n.notFoundBody,
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
                      _DenseRow(
                        icon: ShootIcons.person,
                        label: l10n.notFoundBrowseCreators,
                        divider: RowDivider.top,
                        onTap: () => context.go(AppRoutes.creators),
                      ),
                      _DenseRow(
                        icon: ShootIcons.calendar,
                        label: l10n.notFoundYourBookings,
                        divider: RowDivider.topAndBottom,
                        onTap: () => context.go(AppRoutes.accountBookings),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: ShootSpace.s5),
                TopHit(
                  label: l10n.notFoundAction,
                  centered: true,
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

/// Board 37's row: min-height 44, 15 px, hairlines, no padding.
class _DenseRow extends StatelessWidget {
  const _DenseRow({
    required this.icon,
    required this.label,
    required this.divider,
    required this.onTap,
  });

  final ShootIcons icon;
  final String label;
  final RowDivider divider;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ShootRow(
      leading: IconTile(icon),
      label: label,
      minHeight: 44,
      padding: EdgeInsetsDirectional.zero,
      labelStyle: const TextStyle(
        fontSize: 15,
        leadingDistribution: TextLeadingDistribution.even,
        fontFamilyFallback: ['Noto Sans Arabic'],
      ),
      divider: divider,
      onTap: onTap,
    );
  }
}
