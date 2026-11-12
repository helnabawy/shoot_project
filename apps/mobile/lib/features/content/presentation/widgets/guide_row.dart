import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/l10n/bidi.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_scene.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/widgets/group_label.dart';
import 'package:shoot_mobile/core/widgets/scene_tile.dart';
import 'package:shoot_mobile/core/widgets/shoot_image.dart';
import 'package:shoot_mobile/features/content/domain/entities/guides.dart';
import 'package:shoot_mobile/features/content/presentation/widgets/content_icons.dart';

/// A guide in a list (boards 33 and 34): a 64 px cover, its topic, title and "By {author} · {n} min
/// read". A guide with no cover shows the designed scene tile. [onTap] opens the article.
class GuideRow extends StatelessWidget {
  const GuideRow({
    super.key,
    required this.guide,
    required this.onTap,
    this.first = false,
  });

  final ArticleSummary guide;
  final VoidCallback onTap;

  /// The first row has the list's top hairline; every row has its own bottom one on the last.
  final bool first;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    final byline = [
      if (guide.author case final author?) l10n.guidesBy(author.name),
      l10n.guidesMinutes(guide.readingMinutes),
    ].join(' · ');
    final topic = guide.categories.isEmpty ? null : guide.categories.first.name;
    final title = Text(
      guide.title,
      style: ShootType.row.copyWith(fontWeight: FontWeight.w600, color: c.ink),
    );
    final cover = guide.cover == null
        ? SceneTile(
            child: ContentIcon(
              ContentIcons.image,
              size: 20,
              strokeWidth: 1.8,
              color: context.scene.sceneInk,
            ),
          )
        : ShootImage(guide.cover);
    return Semantics(
      link: true,
      label: [?topic, guide.title, byline].join(', '),
      onTap: onTap,
      excludeSemantics: true,
      child: InkWell(
        onTap: onTap,
        highlightColor: c.selectedHover,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 88),
          child: Padding(
            padding: const EdgeInsetsDirectional.symmetric(vertical: 12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(ShootRadius.photoTile),
                  child: SizedBox.square(dimension: 64, child: cover),
                ),
                const SizedBox(width: ShootSpace.s3),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    spacing: ShootSpace.s1,
                    children: [
                      if (topic != null) GroupLabel(topic),
                      // A title kept in English reads left to right inside an Arabic screen.
                      guide.inRequestedLanguage
                          ? title
                          : Directionality(
                              textDirection: TextDirection.ltr,
                              child: Align(
                                alignment: AlignmentDirectional.centerStart,
                                child: title,
                              ),
                            ),
                      Text(
                        isolate(context, byline),
                        style: ShootType.meta.copyWith(color: c.mute),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// A list of [rows] with the boards' hairlines: one above each row and one below the last.
class HairlineList extends StatelessWidget {
  const HairlineList({super.key, required this.rows});

  final List<Widget> rows;

  @override
  Widget build(BuildContext context) {
    final hair = BorderSide(color: context.colors.hair);
    return Column(
      children: [
        for (final (i, row) in rows.indexed)
          // A Container, not a DecoratedBox: CSS borders add to the box, they do not overlap it.
          // ignore: use_decorated_box
          Container(
            decoration: BoxDecoration(
              border: Border(
                top: hair,
                bottom: i == rows.length - 1 ? hair : BorderSide.none,
              ),
            ),
            child: row,
          ),
      ],
    );
  }
}
