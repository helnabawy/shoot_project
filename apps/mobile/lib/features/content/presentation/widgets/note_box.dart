import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/features/content/presentation/widgets/content_icons.dart';

/// The board's note: a `tile` box with an icon and 14 px text, for "the English text governs" (36)
/// and for text that is only available in English (34, 36).
class NoteBox extends StatelessWidget {
  const NoteBox({
    super.key,
    required this.text,
    this.icon = ContentIcons.scale,
    this.child,
  });

  final String text;
  final ContentIcons icon;

  /// A trailing widget under the text (a link), if any.
  final Widget? child;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      padding: const EdgeInsetsDirectional.symmetric(
        horizontal: 14,
        vertical: 12,
      ),
      decoration: BoxDecoration(
        color: c.tile,
        borderRadius: BorderRadius.circular(ShootRadius.row),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 1),
            child: ContentIcon(
              icon,
              size: 18,
              strokeWidth: 2,
              color: c.tileInk,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  text,
                  style: ShootType.body.copyWith(
                    fontSize: 14,
                    height: 1.5,
                    color: c.bodyInk,
                  ),
                ),
                ?child,
              ],
            ),
          ),
        ],
      ),
    );
  }
}
