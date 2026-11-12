import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/widgets/choice_chip.dart';
import 'package:shoot_mobile/core/widgets/shoot_scaffold.dart';
import 'package:shoot_mobile/features/content/domain/entities/guides.dart';
import 'package:shoot_mobile/features/content/presentation/widgets/content_header.dart';
import 'package:shoot_mobile/features/content/presentation/widgets/content_icons.dart';
import 'package:shoot_mobile/features/content/presentation/widgets/guide_row.dart';
import 'package:shoot_mobile/features/content/presentation/widgets/pinned_footer_scroll.dart';
import 'package:shoot_mobile/features/content/presentation/widgets/ready_to_brief_band.dart';

/// Screens 33: the guides list, newest first (board `S11-guides`). Also the list narrowed to a
/// topic or an author (FR-016), whose title names it.
class GuidesPage extends StatelessWidget {
  const GuidesPage({
    super.key,
    required this.guides,
    required this.onTopic,
    required this.onPage,
    required this.onGuide,
    required this.onFeed,
    required this.onWhatsapp,
  });

  final GuideList guides;

  /// Picks a topic by slug, or all topics for `null`.
  final ValueChanged<String?> onTopic;
  final ValueChanged<int> onPage;
  final ValueChanged<String> onGuide;
  final VoidCallback onFeed;
  final VoidCallback onWhatsapp;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    final category = guides.category;
    final author = guides.author;
    final title = author?.name ?? category?.name ?? l10n.guidesTitle;
    final line = author?.bio ?? category?.description ?? l10n.guidesIntro;
    final topics = [
      for (final topic in guides.categories)
        if (topic.count > 0) topic,
    ];
    final paging = guides.pagination;
    return ShootScaffold(
      child: Column(
        children: [
          const ContentHeader(),
          Expanded(
            child: PinnedFooterScroll(
              footer: Padding(
                padding: const EdgeInsetsDirectional.fromSTEB(12, 0, 12, 18),
                child: ReadyToBriefBand(onWhatsapp: onWhatsapp),
              ),
              children: [
                Padding(
                  padding: const EdgeInsetsDirectional.fromSTEB(20, 8, 20, 0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    spacing: ShootSpace.s2,
                    children: [
                      Semantics(
                        header: true,
                        // `.h1` is a block as wide as the column.
                        child: SizedBox(
                          key: const ValueKey('fidelity:h1'),
                          width: double.infinity,
                          child: Text(
                            title,
                            style: ShootType.display.copyWith(color: c.ink),
                          ),
                        ),
                      ),
                      Text(
                        line,
                        style: ShootType.body.copyWith(color: c.bodyInk),
                      ),
                    ],
                  ),
                ),
                if (topics.isNotEmpty)
                  Padding(
                    padding: const EdgeInsetsDirectional.fromSTEB(
                      20,
                      16,
                      20,
                      0,
                    ),
                    child: Semantics(
                      container: true,
                      explicitChildNodes: true,
                      label: l10n.guidesTopics,
                      child: ChipGroup(
                        children: [
                          ShootChip(
                            label: l10n.guidesAll,
                            on: category == null && author == null,
                            onTap: () => onTopic(null),
                          ),
                          for (final topic in topics)
                            ShootChip(
                              label: topic.name,
                              on: category?.slug == topic.slug,
                              onTap: () => onTopic(topic.slug),
                            ),
                        ],
                      ),
                    ),
                  ),
                Padding(
                  padding: const EdgeInsetsDirectional.fromSTEB(20, 18, 20, 0),
                  child: HairlineList(
                    rows: [
                      for (final guide in guides.items)
                        GuideRow(
                          guide: guide,
                          onTap: () => onGuide(guide.slug),
                        ),
                    ],
                  ),
                ),
                if (paging.pageCount > 1)
                  Padding(
                    padding: const EdgeInsetsDirectional.fromSTEB(20, 8, 20, 0),
                    child: _PageNav(
                      page: paging.page,
                      count: paging.pageCount,
                      onPrevious: paging.hasPrevious
                          ? () => onPage(paging.page - 1)
                          : null,
                      onNext: paging.hasNext
                          ? () => onPage(paging.page + 1)
                          : null,
                    ),
                  ),
                Padding(
                  padding: const EdgeInsetsDirectional.fromSTEB(20, 4, 20, 0),
                  child: Align(
                    alignment: AlignmentDirectional.centerStart,
                    child: _FeedLink(label: l10n.guidesRss, onTap: onFeed),
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

/// "Previous", "Page n of m", "Next": the missing direction is muted text, not a button.
class _PageNav extends StatelessWidget {
  const _PageNav({
    required this.page,
    required this.count,
    required this.onPrevious,
    required this.onNext,
  });

  final int page;
  final int count;
  final VoidCallback? onPrevious;
  final VoidCallback? onNext;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    Widget action(String label, VoidCallback? onTap, AlignmentGeometry align) {
      final style = ShootType.chip.copyWith(
        color: onTap == null ? c.mute : c.accentInk,
        fontWeight: onTap == null ? FontWeight.w400 : FontWeight.w500,
      );
      return Semantics(
        button: true,
        enabled: onTap != null,
        label: label,
        onTap: onTap,
        excludeSemantics: true,
        child: GestureDetector(
          onTap: onTap,
          behavior: HitTestBehavior.opaque,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 44, minWidth: 44),
            child: Align(widthFactor: 1, child: Text(label, style: style)),
          ),
        ),
      );
    }

    return Semantics(
      container: true,
      explicitChildNodes: true,
      label: l10n.guidesPages,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          action(
            l10n.guidesPrevious,
            onPrevious,
            AlignmentDirectional.centerStart,
          ),
          Flexible(
            child: Text(
              l10n.guidesPageOf(page, count),
              textAlign: TextAlign.center,
              style: ShootType.num(ShootType.meta).copyWith(color: c.mute),
            ),
          ),
          action(l10n.guidesNext, onNext, AlignmentDirectional.centerEnd),
        ],
      ),
    );
  }
}

/// "Follow the guides with RSS": a quiet link with the feed icon.
class _FeedLink extends StatelessWidget {
  const _FeedLink({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final ink = context.colors.accentInk;
    return Semantics(
      link: true,
      label: label,
      onTap: onTap,
      excludeSemantics: true,
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 44),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            spacing: ShootSpace.s2,
            children: [
              ContentIcon(ContentIcons.rss, color: ink),
              Flexible(
                child: Text(
                  label,
                  style: ShootType.meta.copyWith(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: ink,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
