// The plan names screen goldens by board number (`<id>_<name>_golden_test.dart`).
// ignore_for_file: file_names
@Tags(['golden'])
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/features/content/domain/entities/guides.dart';
import 'package:shoot_mobile/features/content/presentation/pages/guides_page.dart';

import '../../helpers/board_content.dart';
import '../../helpers/content_golden.dart';
import '../../helpers/golden.dart';

Widget _screen(GuideList guides) => GuidesPage(
  guides: guides,
  onTopic: (_) {},
  onPage: (_) {},
  onGuide: (_) {},
  onFeed: () {},
  onWhatsapp: () {},
);

void main() {
  for (final variant in Variant.values) {
    testWidgets(
      'MG-US2-S1 screen 33 renders to its board in ${variant.id}',
      (tester) => pumpBoard(
        tester,
        id: '33',
        variant: variant,
        child: _screen(
          boardGuides(arabic: variant.locale.languageCode == 'ar'),
        ),
      ),
      skip: !goldensEnabled,
    );
  }

  testWidgets(
    'screen 33 self-baselines: no overflow at 393, 430, iPad and text scale 2',
    (tester) => pumpSelfBaselines(
      tester,
      id: '33',
      child: _screen(boardGuides(arabic: false)),
    ),
    skip: !goldensEnabled,
  );

  testWidgets('MG-US2-S2 screen 33 with a topic chosen (no board)', (tester) {
    final all = boardGuides(arabic: false);
    final booking = all.categories[1];
    return pumpContentState(
      tester,
      name: '33-topic',
      child: _screen(
        GuideList(
          locale: all.locale,
          items: [all.items[1]],
          pagination: all.pagination,
          categories: all.categories,
          category: booking,
          author: null,
        ),
      ),
    );
  }, skip: !goldensEnabled);
}
