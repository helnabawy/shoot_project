import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';

/// `.warn` (attention: radius 9, padding 12 14, 14/1.5, peach) and `.msg` (an error: radius 6,
/// padding 12 16, 15/1.8, rose, with an alert icon). Errors are a live region, so they are read
/// out when they appear.
enum BannerTone { attention, error }

class MessageBanner extends StatelessWidget {
  const MessageBanner({super.key, required this.text, required this.tone});

  final String text;
  final BannerTone tone;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final error = tone == BannerTone.error;
    final ink = error ? c.onDanger : c.onAttention;
    return Semantics(
      liveRegion: error,
      container: true,
      child: Container(
        padding: error
            ? const EdgeInsetsDirectional.symmetric(
                horizontal: 16,
                vertical: 12,
              )
            : const EdgeInsetsDirectional.symmetric(
                horizontal: 14,
                vertical: 12,
              ),
        decoration: BoxDecoration(
          color: error ? c.danger : c.attention,
          borderRadius: BorderRadius.circular(
            error ? ShootRadius.message : ShootRadius.row,
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          spacing: 10,
          children: [
            if (error)
              Padding(
                padding: const EdgeInsetsDirectional.only(top: 5),
                child: ShootIcon(ShootIcons.alert, size: 16, color: ink),
              ),
            Expanded(
              child: Text(
                text,
                style: TextStyle(
                  fontSize: error ? 15 : 14,
                  height: error ? 1.8 : 1.5,
                  color: ink,
                  leadingDistribution: TextLeadingDistribution.even,
                  fontFamilyFallback: const ['Noto Sans Arabic'],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
