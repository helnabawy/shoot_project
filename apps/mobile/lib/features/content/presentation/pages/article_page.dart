import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_scene.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/widgets/group_label.dart';
import 'package:shoot_mobile/core/widgets/linked_text.dart';
import 'package:shoot_mobile/core/widgets/scene_tile.dart';
import 'package:shoot_mobile/core/widgets/shoot_image.dart';
import 'package:shoot_mobile/core/widgets/shoot_scaffold.dart';
import 'package:shoot_mobile/features/content/domain/entities/guides.dart';
import 'package:shoot_mobile/features/content/presentation/widgets/content_header.dart';
import 'package:shoot_mobile/features/content/presentation/widgets/content_icons.dart';
import 'package:shoot_mobile/features/content/presentation/widgets/guide_row.dart';
import 'package:shoot_mobile/features/content/presentation/widgets/note_box.dart';
import 'package:shoot_mobile/features/content/presentation/widgets/ready_to_brief_band.dart';
import 'package:shoot_mobile/features/content/presentation/widgets/rich_text_view.dart';

/// Screen 34: one guide (board `S11b-guide`): topic, title, author and reading time, cover, lead,
/// the text, the call to brief and up to two more guides.
class ArticlePage extends StatelessWidget {
  const ArticlePage({
    super.key,
    required this.article,
    required this.onBack,
    required this.onTopic,
    required this.onAuthor,
    required this.onGuide,
    required this.onLink,
    required this.onWhatsapp,
  });

  final Article article;
  final VoidCallback onBack;
  final ValueChanged<String> onTopic;
  final ValueChanged<String> onAuthor;
  final ValueChanged<String> onGuide;
  final void Function(String href) onLink;
  final VoidCallback onWhatsapp;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    final guide = article.summary;
    final arabic = Localizations.localeOf(context).languageCode == 'ar';
    final english = arabic && !guide.inRequestedLanguage;
    final topic = guide.categories.isEmpty ? null : guide.categories.first;
    final author = guide.author;
    final byline = [
      if (author != null) l10n.guidesBy('{author}'),
      l10n.guidesMinutes(guide.readingMinutes),
    ].join(' · ');

    Widget text = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: ShootSpace.s3 + 2,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          spacing: ShootSpace.s2,
          children: [
            if (topic != null)
              Semantics(
                link: true,
                label: topic.name,
                onTap: () => onTopic(topic.slug),
                excludeSemantics: true,
                child: GestureDetector(
                  onTap: () => onTopic(topic.slug),
                  behavior: HitTestBehavior.opaque,
                  child: Text(
                    Localizations.localeOf(context).languageCode == 'ar'
                        ? topic.name
                        : topic.name.toUpperCase(),
                    style: ShootType.groupLabel.copyWith(
                      color: c.accentInk,
                      height: 1.18,
                      letterSpacing:
                          Localizations.localeOf(context).languageCode == 'ar'
                          ? 0
                          : null,
                    ),
                  ),
                ),
              ),
            Semantics(
              header: true,
              child: SizedBox(
                key: const ValueKey('fidelity:h1'),
                width: double.infinity,
                child: Text(
                  guide.title,
                  style: ShootType.displaySignIn.copyWith(color: c.ink),
                ),
              ),
            ),
            LinkedText(
              byline,
              style: ShootType.meta.copyWith(color: c.mute),
              parts: {
                if (author != null)
                  'author': LinkedText.link(
                    author.name,
                    () => onAuthor(author.slug),
                  ),
              },
            ),
          ],
        ),
        // The cover bleeds 8 px past the text column on both sides (`margin: 0 -8px`).
        LayoutBuilder(
          builder: (context, box) {
            final width = box.maxWidth + 16;
            final height = width * 10 / 16;
            return SizedBox(
              height: height,
              child: OverflowBox(
                minWidth: width,
                maxWidth: width,
                child: SizedBox(
                  width: width,
                  height: height,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(ShootRadius.photoLarge),
                    child: guide.cover == null
                        ? SceneTile(
                            variant: 1,
                            child: ContentIcon(
                              ContentIcons.image,
                              size: 26,
                              strokeWidth: 1.8,
                              color: context.scene.sceneInk,
                            ),
                          )
                        : ShootImage(guide.cover),
                  ),
                ),
              ),
            );
          },
        ),
        if (guide.summary.isNotEmpty)
          Text(
            guide.summary,
            style: ShootType.body.copyWith(
              fontSize: 18,
              height: 1.55,
              fontWeight: FontWeight.w500,
              color: c.ink,
            ),
          ),
        RichTextView(document: article.body, onLink: onLink),
      ],
    );
    if (english) {
      // English text stays English: left to right inside the Arabic screen (FR-043).
      text = Directionality(textDirection: TextDirection.ltr, child: text);
    }

    final related = article.related.take(2).toList();
    return ShootScaffold(
      child: Column(
        children: [
          ContentHeader.back(backLabel: l10n.guidesBack, onBack: onBack),
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Padding(
                    padding: const EdgeInsetsDirectional.fromSTEB(20, 8, 20, 0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      spacing: ShootSpace.s3 + 2,
                      children: [
                        if (english) NoteBox(text: l10n.englishOnly),
                        text,
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsetsDirectional.fromSTEB(
                      12,
                      28,
                      12,
                      0,
                    ),
                    child: ReadyToBriefBand(onWhatsapp: onWhatsapp),
                  ),
                  if (related.isNotEmpty)
                    Padding(
                      padding: const EdgeInsetsDirectional.fromSTEB(
                        20,
                        28,
                        20,
                        0,
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          GroupLabel(
                            l10n.guidesMore,
                            padding: const EdgeInsets.only(bottom: 2),
                          ),
                          HairlineList(
                            rows: [
                              for (final other in related)
                                GuideRow(
                                  guide: other,
                                  onTap: () => onGuide(other.slug),
                                ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  const SizedBox(height: ShootSpace.s6),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
