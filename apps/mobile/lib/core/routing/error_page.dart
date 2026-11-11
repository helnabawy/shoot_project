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

/// Screen 39, built to board `S10c-error`: something failed. It never shows technical text.
/// "Try again" runs [onRetry]; the WhatsApp row appears only with the site's [whatsappNumber]
/// (from feature 008), and [onWhatsapp] opens the chat.
class ErrorPage extends StatelessWidget {
  const ErrorPage({
    super.key,
    required this.onRetry,
    this.whatsappNumber,
    this.onWhatsapp,
  });

  final VoidCallback onRetry;
  final String? whatsappNumber;
  final VoidCallback? onWhatsapp;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    void home() => GoRouter.maybeOf(context)?.go(AppRoutes.home);
    final rows = [
      if (whatsappNumber != null)
        (ShootIcons.whatsapp, l10n.errorWhatsapp, onWhatsapp),
      (ShootIcons.home, l10n.errorHome, home),
    ];
    return ShootScaffold(
      child: Column(
        children: [
          ShootHeader(
            leading: Wordmark(label: l10n.appTitle, onTap: home),
            trailing: const [LanguageAction()],
          ),
          Expanded(
            child: Center(
              child: Padding(
                padding: const EdgeInsetsDirectional.symmetric(
                  horizontal: ShootSpace.s8,
                ),
                child: EmptyState(
                  mark: const IconTile.big(ShootIcons.alert),
                  title: l10n.errorTitle,
                  titleKey: const ValueKey('fidelity:h1'),
                  body: l10n.errorBody,
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
                          leading: IconTile(icon, iconSize: 15),
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
                  label: l10n.errorRetry,
                  leading: ShootIcons.refresh,
                  chevron: true,
                  onPressed: onRetry,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Shows screen 39 in place of a widget that failed to build, and returns a function that restores
/// the previous builder. `main.dart` installs it in release builds; debug builds keep Flutter's red
/// error screen for developers.
VoidCallback installErrorPage() {
  final previous = ErrorWidget.builder;
  ErrorWidget.builder = (details) => const _FailedBuildPage();
  return () => ErrorWidget.builder = previous;
}

class _FailedBuildPage extends StatelessWidget {
  const _FailedBuildPage();

  @override
  Widget build(BuildContext context) {
    // "Try again" opens the same location as a new page, which runs the failed builder again.
    return ErrorPage(
      onRetry: () {
        final router = GoRouter.maybeOf(context);
        if (router == null) return;
        router.go(
          router.routerDelegate.currentConfiguration.uri.toString(),
          extra: Object(),
        );
      },
    );
  }
}
