import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:shoot_mobile/core/l10n/bidi.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/time/clock.dart';
import 'package:shoot_mobile/core/widgets/choice_chip.dart';
import 'package:shoot_mobile/core/widgets/group_label.dart';
import 'package:shoot_mobile/core/widgets/shoot_row.dart';
import 'package:shoot_mobile/core/widgets/shoot_scaffold.dart';
import 'package:shoot_mobile/core/widgets/text_link.dart';
import 'package:shoot_mobile/features/content/domain/entities/legal.dart';
import 'package:shoot_mobile/features/content/domain/legal_sections.dart';
import 'package:shoot_mobile/features/content/presentation/legal_format.dart';
import 'package:shoot_mobile/features/content/presentation/widgets/content_header.dart';
import 'package:shoot_mobile/features/content/presentation/widgets/content_icons.dart';
import 'package:shoot_mobile/features/content/presentation/widgets/guide_row.dart';
import 'package:shoot_mobile/features/content/presentation/widgets/note_box.dart';
import 'package:shoot_mobile/features/content/presentation/widgets/pinned_footer_scroll.dart';
import 'package:shoot_mobile/features/content/presentation/widgets/rich_text_view.dart';

/// Screen 36: a legal document (board `S13-legal`): the title, the version and the date it applies
/// from, the switch between the three documents, the governing-language note, the table of
/// contents, the numbered sections and the way to earlier versions. It is for reading: it has no
/// primary action (FR-006).
class LegalPage extends StatefulWidget {
  const LegalPage({
    super.key,
    required this.document,
    required this.clock,
    required this.onKind,
    required this.onEarlierVersions,
    required this.onLink,
    required this.onVersionInForce,
    @visibleForTesting this.contents,
  });

  final LegalDocument document;
  final Clock clock;

  /// Picks one of the three documents; its own path opens.
  final ValueChanged<LegalKind> onKind;
  final VoidCallback onEarlierVersions;
  final void Function(String href) onLink;

  /// From an earlier version to the version in force.
  final VoidCallback onVersionInForce;

  /// A table of contents other than the document's headings (the board's placeholder lists five
  /// rows over one section of text); goldens only.
  final List<LegalSection>? contents;

  @override
  State<LegalPage> createState() => _LegalPageState();
}

class _LegalPageState extends State<LegalPage> {
  final Map<int, GlobalKey> _headingKeys = {};

  List<LegalSection> get _sections =>
      widget.contents ?? tocOf(widget.document.body);

  @override
  void initState() {
    super.initState();
    _syncKeys();
  }

  @override
  void didUpdateWidget(LegalPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    _syncKeys();
  }

  void _syncKeys() {
    final wanted = {for (final s in _sections) s.blockIndex};
    _headingKeys.removeWhere((index, _) => !wanted.contains(index));
    for (final index in wanted) {
      _headingKeys.putIfAbsent(index, GlobalKey.new);
    }
  }

  void _goTo(LegalSection section) {
    final target = _headingKeys[section.blockIndex]?.currentContext;
    if (target == null) return;
    final instant = MediaQuery.disableAnimationsOf(context);
    unawaited(
      Scrollable.ensureVisible(
        target,
        alignment: 0.04,
        duration: instant ? Duration.zero : ShootMotion.slow,
        curve: ShootMotion.standard,
      ),
    );
    // The screen reader moves to the section: its heading is read out.
    unawaited(
      SemanticsService.sendAnnouncement(
        View.of(context),
        section.title,
        Directionality.of(context),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    final document = widget.document;
    final arabic = Localizations.localeOf(context).languageCode == 'ar';
    final englishText = arabic && !document.inRequestedLanguage;
    final sections = _sections;
    final earlier = document.until != null;
    final date = legalDate(context, document.effectiveFrom, widget.clock);
    final upcoming = document.upcoming;

    Widget body = RichTextView(
      document: document.body,
      onLink: widget.onLink,
      gap: ShootSpace.s2 + 2,
      headingKeys: _headingKeys,
    );
    if (englishText) {
      // English text stays English: left to right inside the Arabic screen (FR-005, FR-043).
      body = Directionality(textDirection: TextDirection.ltr, child: body);
    }

    final kinds = [
      (LegalKind.terms, l10n.legalDocTerms),
      (LegalKind.professionalTerms, l10n.legalDocProfessional),
      (LegalKind.privacy, l10n.legalDocPrivacy),
    ];

    return ShootScaffold(
      child: Column(
        children: [
          const ContentHeader(),
          Expanded(
            child: PinnedFooterScroll(
              footer: Padding(
                padding: const EdgeInsetsDirectional.fromSTEB(20, 0, 20, 20),
                child: Semantics(
                  container: true,
                  explicitChildNodes: true,
                  label: l10n.legalVersionsNav,
                  child: ShootRow(
                    leading: const ContentTile(ContentIcons.clock),
                    label: l10n.legalEarlierVersions,
                    trailing: Text(
                      l10n.legalAllVersions,
                      style: ShootType.meta.copyWith(color: c.mute),
                    ),
                    divider: RowDivider.topAndBottom,
                    onTap: widget.onEarlierVersions,
                  ),
                ),
              ),
              children: [
                Padding(
                  padding: const EdgeInsetsDirectional.fromSTEB(20, 8, 20, 0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    spacing: ShootSpace.s2,
                    children: [
                      GroupLabel(l10n.legalLabel, lineHeight: 1.18),
                      Semantics(
                        header: true,
                        child: SizedBox(
                          key: const ValueKey('fidelity:h1'),
                          width: double.infinity,
                          child: Text(
                            isolate(context, document.title),
                            style: ShootType.display.copyWith(color: c.ink),
                          ),
                        ),
                      ),
                      Text(
                        l10n.legalVersionLine(document.version, date),
                        style: ShootType.num(ShootType.meta)
                            .copyWith(color: c.mute),
                      ),
                      if (upcoming != null)
                        Text(
                          l10n.legalUpcoming(
                            upcoming.version,
                            legalDate(
                              context,
                              upcoming.effectiveFrom,
                              widget.clock,
                            ),
                          ),
                          style: ShootType.num(ShootType.meta)
                              .copyWith(color: c.mute),
                        ),
                    ],
                  ),
                ),
                if (earlier)
                  Padding(
                    padding: const EdgeInsetsDirectional.fromSTEB(
                      12,
                      16,
                      12,
                      0,
                    ),
                    child: NoteBox(
                      text: l10n.legalNewerInForce,
                      icon: ContentIcons.clock,
                      child: TextLink(
                        label: l10n.legalReadNewer,
                        onTap: widget.onVersionInForce,
                        style: ShootType.meta.copyWith(fontSize: 14),
                      ),
                    ),
                  ),
                Padding(
                  padding: const EdgeInsetsDirectional.fromSTEB(20, 16, 20, 0),
                  child: Semantics(
                    container: true,
                    explicitChildNodes: true,
                    label: l10n.legalDocuments,
                    child: ChipGroup(
                      children: [
                        for (final (kind, label) in kinds)
                          ShootChip(
                            label: label,
                            on: kind == document.kind,
                            onTap: () => widget.onKind(kind),
                          ),
                      ],
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsetsDirectional.fromSTEB(12, 16, 12, 0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    spacing: ShootSpace.s2,
                    children: [
                      NoteBox(text: l10n.legalGoverns),
                      if (englishText)
                        NoteBox(
                          text: l10n.legalArabicUnavailable,
                          icon: ContentIcons.scale,
                        ),
                    ],
                  ),
                ),
                if (sections.isNotEmpty)
                  Padding(
                    padding: const EdgeInsetsDirectional.fromSTEB(
                      20,
                      22,
                      20,
                      0,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        GroupLabel(
                          l10n.legalInThisDocument,
                          padding: const EdgeInsets.only(bottom: 6),
                        ),
                        HairlineList(
                          rows: [
                            for (final section in sections)
                              _TocRow(
                                section: section,
                                onTap: () => _goTo(section),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                Padding(
                  padding: const EdgeInsetsDirectional.fromSTEB(20, 24, 20, 24),
                  child: body,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// A table-of-contents row: the clause number, then its title; at least 44 high.
class _TocRow extends StatelessWidget {
  const _TocRow({required this.section, required this.onTap});

  final LegalSection section;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      link: true,
      label: '${section.number}. ${section.title}',
      onTap: onTap,
      excludeSemantics: true,
      child: InkWell(
        onTap: onTap,
        highlightColor: c.selectedHover,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 44),
          child: Padding(
            padding: const EdgeInsetsDirectional.symmetric(vertical: 4),
            child: Row(
              children: [
                SizedBox(
                  width: 20,
                  child: Text(
                    section.number,
                    style: ShootType.num(ShootType.meta)
                        .copyWith(color: c.mute),
                  ),
                ),
                const SizedBox(width: ShootSpace.s3),
                Expanded(
                  child: Text(
                    isolate(context, section.title),
                    style: ShootType.row.copyWith(fontSize: 15, color: c.ink),
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
