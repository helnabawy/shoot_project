import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/l10n/bidi.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/time/clock.dart';
import 'package:shoot_mobile/core/widgets/group_label.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';
import 'package:shoot_mobile/core/widgets/shoot_scaffold.dart';
import 'package:shoot_mobile/features/content/domain/entities/legal.dart';
import 'package:shoot_mobile/features/content/presentation/legal_format.dart';
import 'package:shoot_mobile/features/content/presentation/widgets/content_header.dart';
import 'package:shoot_mobile/features/content/presentation/widgets/guide_row.dart';

/// Every published version of a legal document, newest first, each with the period it was in force;
/// a tap opens its full text (MG-US1-S5).
class LegalVersionsPage extends StatelessWidget {
  const LegalVersionsPage({
    super.key,
    required this.versions,
    required this.clock,
    required this.onBack,
    required this.onVersion,
  });

  final LegalVersions versions;
  final Clock clock;
  final VoidCallback onBack;
  final ValueChanged<LegalVersionEntry> onVersion;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    String period(LegalVersionEntry entry) {
      final from = legalDate(context, entry.from, clock);
      final until = entry.until;
      return until == null
          ? l10n.legalPeriodOpen(from)
          : l10n.legalPeriod(from, legalDate(context, until, clock));
    }

    return ShootScaffold(
      child: Column(
        children: [
          ContentHeader.back(backLabel: l10n.legalDocuments, onBack: onBack),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsetsDirectional.fromSTEB(20, 8, 20, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  GroupLabel(l10n.legalEarlierVersions),
                  const SizedBox(height: ShootSpace.s2),
                  Semantics(
                    header: true,
                    child: SizedBox(
                      key: const ValueKey('fidelity:h1'),
                      width: double.infinity,
                      child: Text(
                        isolate(context, versions.title),
                        style: ShootType.display.copyWith(color: c.ink),
                      ),
                    ),
                  ),
                  const SizedBox(height: ShootSpace.s4),
                  Semantics(
                    container: true,
                    explicitChildNodes: true,
                    label: l10n.legalVersionsNav,
                    child: HairlineList(
                      rows: [
                        for (final entry in versions.versions)
                          _VersionRow(
                            title:
                                '${l10n.legalVersionNumber(entry.version)} · ${period(entry)}',
                            summary: entry.changeSummary,
                            onTap: () => onVersion(entry),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _VersionRow extends StatelessWidget {
  const _VersionRow({
    required this.title,
    required this.summary,
    required this.onTap,
  });

  final String title;
  final String? summary;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      link: true,
      label: [title, ?summary].join(', '),
      onTap: onTap,
      excludeSemantics: true,
      child: InkWell(
        onTap: onTap,
        highlightColor: c.selectedHover,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 56),
          child: Padding(
            padding: const EdgeInsetsDirectional.symmetric(vertical: 8),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    spacing: 2,
                    children: [
                      Text(title, style: ShootType.row.copyWith(color: c.ink)),
                      if (summary case final text?)
                        Text(
                          isolate(context, text),
                          style: ShootType.meta.copyWith(color: c.mute),
                        ),
                    ],
                  ),
                ),
                const SizedBox(width: ShootSpace.s3),
                ShootIcon(ShootIcons.chevron, size: 16, color: c.mute),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
