// The plan names screen goldens by board number (`<id>_<name>_golden_test.dart`).
// ignore_for_file: file_names
@Tags(['golden'])
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/time/clock.dart';
import 'package:shoot_mobile/features/content/domain/entities/legal.dart';
import 'package:shoot_mobile/features/content/domain/legal_sections.dart';
import 'package:shoot_mobile/features/content/presentation/pages/legal_page.dart';

import '../../helpers/board_content.dart';
import '../../helpers/content_golden.dart';
import '../../helpers/golden.dart';

/// The board's contents list five rows over one section of text.
List<LegalSection> _contents({required bool arabic}) => [
  for (var i = 0; i < 5; i++)
    LegalSection(
      id: 'section-$i',
      number: '${i + 1}',
      title: arabic
          ? '[عنوان القسم من نظام إدارة المحتوى]'
          : '[SECTION TITLE FROM CMS]',
      blockIndex: i == 0 ? 0 : -1,
    ),
];

Widget _screen(LegalDocument document, {required bool arabic}) => LegalPage(
  document: document,
  clock: FixedClock(DateTime.utc(2026, 11, 12)),
  contents: _contents(arabic: arabic),
  onKind: (_) {},
  onEarlierVersions: () {},
  onLink: (_) {},
  onVersionInForce: () {},
);

void main() {
  for (final variant in Variant.values) {
    testWidgets('MG-US1-S1 screen 36 renders to its board in ${variant.id}', (
      tester,
    ) {
      final arabic = variant.locale.languageCode == 'ar';
      return pumpBoard(
        tester,
        id: '36',
        variant: variant,
        child: _screen(boardLegal(arabic: arabic), arabic: arabic),
      );
    }, skip: !goldensEnabled);
  }

  testWidgets(
    'screen 36 self-baselines: no overflow at 393, 430, iPad and text scale 2',
    (tester) => pumpSelfBaselines(
      tester,
      id: '36',
      child: _screen(boardLegal(arabic: false), arabic: false),
    ),
    skip: !goldensEnabled,
  );

  testWidgets('MG-US1-S5 screen 36 showing an earlier version (no board)', (
    tester,
  ) {
    final current = boardLegal(arabic: false);
    return pumpContentState(
      tester,
      name: '36-earlier-version',
      size: const Size(360, 1100),
      child: _screen(
        LegalDocument(
          locale: current.locale,
          kind: current.kind,
          title: current.title,
          version: 2,
          effectiveFrom: DateTime.utc(2026, 6),
          until: DateTime.utc(2026, 11),
          body: current.body,
          inRequestedLanguage: true,
        ),
        arabic: false,
      ),
    );
  }, skip: !goldensEnabled);

  testWidgets(
    'MG-US1-S6 screen 36 in Arabic with English text and both notices (no board)',
    (tester) {
      final current = boardLegal(arabic: false);
      return pumpContentState(
        tester,
        name: '36-english-in-arabic',
        variant: Variant.arLight,
        size: const Size(360, 1100),
        child: _screen(
          LegalDocument(
            locale: 'en',
            kind: current.kind,
            title: current.title,
            version: 3,
            effectiveFrom: current.effectiveFrom,
            until: null,
            body: current.body,
            inRequestedLanguage: false,
          ),
          arabic: false,
        ),
      );
    },
    skip: !goldensEnabled,
  );
}
