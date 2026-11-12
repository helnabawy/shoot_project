import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/routing/app_routes.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/widgets/top_hit.dart';
import 'package:shoot_mobile/features/content/presentation/widgets/content_icons.dart';

/// `.band`: "Ready to brief?" at the foot of guides (boards 33 and 34). A dark panel with the one
/// primary action, "Start a brief" (the landing's brief at its first step), and a quiet "WhatsApp
/// us" that opens WhatsApp with the default message.
class ReadyToBriefBand extends StatelessWidget {
  const ReadyToBriefBand({super.key, required this.onWhatsapp, this.onBrief});

  final VoidCallback onWhatsapp;

  /// Defaults to going to the landing (`/`).
  final VoidCallback? onBrief;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    // On the board the band is the ink panel with ground-coloured text, whatever the theme.
    final onBand = c.ground;
    return Container(
      padding: const EdgeInsetsDirectional.fromSTEB(16, 20, 16, 16),
      decoration: BoxDecoration(
        color: c.ink,
        borderRadius: BorderRadius.circular(ShootRadius.panel),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 10,
        children: [
          Semantics(
            header: true,
            child: Text(
              l10n.briefBandTitle,
              style: ShootType.heading.copyWith(color: onBand),
            ),
          ),
          Text(
            l10n.briefBandBody,
            style: ShootType.body.copyWith(
              height: 1.5,
              color: onBand.withValues(alpha: 0.86),
            ),
          ),
          Padding(
            padding: const EdgeInsetsDirectional.only(top: 6),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: ShootSpace.s1,
              children: [
                TopHit(
                  label: l10n.notFoundAction,
                  chevron: true,
                  onPressed: onBrief ?? () => context.go(AppRoutes.home),
                ),
                Semantics(
                  link: true,
                  label: l10n.briefBandWhatsapp,
                  onTap: onWhatsapp,
                  excludeSemantics: true,
                  child: InkWell(
                    onTap: onWhatsapp,
                    borderRadius: BorderRadius.circular(ShootRadius.row),
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(minHeight: 44),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        spacing: ShootSpace.s2,
                        children: [
                          ContentIcon(
                            ContentIcons.whatsapp,
                            size: 18,
                            strokeWidth: 2,
                            color: onBand,
                          ),
                          Text(
                            l10n.briefBandWhatsapp,
                            style: ShootType.button.copyWith(
                              fontSize: 15,
                              color: onBand,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
