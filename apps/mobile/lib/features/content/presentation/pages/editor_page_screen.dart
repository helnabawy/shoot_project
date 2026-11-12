import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/content/cta.dart';
import 'package:shoot_mobile/core/content/sections.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/widgets/secondary_button.dart';
import 'package:shoot_mobile/core/widgets/shoot_row.dart';
import 'package:shoot_mobile/core/widgets/shoot_scaffold.dart';
import 'package:shoot_mobile/core/widgets/top_hit.dart';
import 'package:shoot_mobile/features/content/domain/entities/editor_page.dart';
import 'package:shoot_mobile/features/content/domain/page_layout.dart';
import 'package:shoot_mobile/features/content/presentation/widgets/content_header.dart';
import 'package:shoot_mobile/features/content/presentation/widgets/content_icons.dart';
import 'package:shoot_mobile/features/content/presentation/widgets/page_sections.dart';
import 'package:shoot_mobile/features/content/presentation/widgets/pinned_footer_scroll.dart';
import 'package:shoot_mobile/features/content/presentation/widgets/rich_text_view.dart';

/// Screen 35: a page an editor built in the CMS (board `S12-page`). Draws steps, questions,
/// long-form text and calls to action, in the editor's order; skips the rest (research R1). Its one
/// primary action is "Start a brief" unless the page's own call to action names another.
class EditorPageScreen extends StatelessWidget {
  const EditorPageScreen({
    super.key,
    required this.page,
    required this.onBrief,
    required this.onCta,
    required this.onLink,
    required this.onOpenWebsite,
  });

  final EditorPage page;

  /// "Start a brief".
  final VoidCallback onBrief;

  /// A call to action of the page (its primary or secondary action).
  final void Function(Cta cta) onCta;
  final void Function(String href) onLink;

  /// Opens this page on the website.
  final VoidCallback onOpenWebsite;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    final sections = drawnSections(page);
    final intro = introOf(page);
    final action = pageAction(page);

    Widget section(int index, Section s) {
      final top = index == 0 && s is HowItWorksSection ? 14.0 : 26.0;
      return Padding(
        padding: EdgeInsetsDirectional.fromSTEB(20, top, 20, 0),
        child: switch (s) {
          HowItWorksSection() => Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (index != 0) ...[
                Semantics(
                  header: true,
                  child: Text(
                    s.heading,
                    style: ShootType.heading.copyWith(color: c.ink),
                  ),
                ),
                if (s.subheading case final text?) ...[
                  const SizedBox(height: ShootSpace.s2),
                  Text(text, style: ShootType.body.copyWith(color: c.bodyInk)),
                ],
                const SizedBox(height: ShootSpace.s2),
              ],
              StepsList(steps: s.steps),
            ],
          ),
          FaqSection() => FaqList(
            heading: s.heading,
            items: s.items,
            onLink: onLink,
          ),
          RichTextSection() => RichTextView(
            document: s.content,
            onLink: onLink,
          ),
          CallToActionSection() => Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: ShootSpace.s2,
            children: [
              Semantics(
                header: true,
                child: Text(
                  s.heading,
                  style: ShootType.heading.copyWith(color: c.ink),
                ),
              ),
              if (s.body case final text?)
                Text(text, style: ShootType.body.copyWith(color: c.bodyInk)),
              if (s.secondary case final cta?)
                Padding(
                  padding: const EdgeInsets.only(top: ShootSpace.s2),
                  child: SecondaryButton(
                    label: cta.label,
                    onPressed: () => onCta(cta),
                  ),
                ),
            ],
          ),
          _ => const SizedBox.shrink(),
        },
      );
    }

    return ShootScaffold(
      child: Column(
        children: [
          const ContentHeader(),
          Expanded(
            child: PinnedFooterScroll(
              footer: Padding(
                padding: const EdgeInsetsDirectional.fromSTEB(12, 24, 12, 18),
                child: TopHit(
                  label: action?.label ?? l10n.notFoundAction,
                  chevron: true,
                  onPressed: action == null ? onBrief : () => onCta(action),
                ),
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
                        child: SizedBox(
                          key: const ValueKey('fidelity:h1'),
                          width: double.infinity,
                          child: Text(
                            page.title,
                            style: ShootType.display.copyWith(color: c.ink),
                          ),
                        ),
                      ),
                      if (intro != null)
                        Text(
                          intro,
                          style: ShootType.body.copyWith(color: c.bodyInk),
                        ),
                    ],
                  ),
                ),
                for (final (i, s) in sections.indexed) section(i, s),
                if (isEmptyForApp(page))
                  Padding(
                    padding: const EdgeInsetsDirectional.fromSTEB(
                      20,
                      16,
                      20,
                      0,
                    ),
                    child: ShootRow(
                      leading: const ContentTile(ContentIcons.book),
                      label: l10n.pageOpenOnWebsite,
                      divider: RowDivider.topAndBottom,
                      onTap: onOpenWebsite,
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
