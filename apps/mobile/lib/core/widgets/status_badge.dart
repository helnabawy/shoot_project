import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';

/// The badge tones on the boards: `.att`, `.ok`, `.bad`, `.n`, and the accent.
enum BadgeTone { attention, success, danger, neutral, accent }

/// `.badge`: 24 high, pill, padding 0 10, gap 6, a 6 px dot, the `badge` type (13/500). The text
/// always says the state; colour is never the only signal.
class StatusBadge extends StatelessWidget {
  const StatusBadge({super.key, required this.label, required this.tone});

  final String label;
  final BadgeTone tone;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final (bg, ink) = switch (tone) {
      BadgeTone.attention => (c.attention, c.onAttention),
      BadgeTone.success => (c.success, c.onSuccess),
      BadgeTone.danger => (c.danger, c.onDanger),
      BadgeTone.neutral => (c.tile, c.tileInk),
      BadgeTone.accent => (c.selected, c.accentInk),
    };
    return Container(
      constraints: const BoxConstraints(minHeight: 24),
      padding: const EdgeInsetsDirectional.symmetric(horizontal: 10),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(ShootRadius.pill),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        spacing: 6,
        children: [
          ExcludeSemantics(
            child: Container(
              width: 6,
              height: 6,
              decoration: BoxDecoration(color: ink, shape: BoxShape.circle),
            ),
          ),
          Flexible(
            child: Text(label, style: ShootType.badge.copyWith(color: ink)),
          ),
        ],
      ),
    );
  }
}
