// The plan names screen goldens by board number (`<id>_<name>_golden_test.dart`).
// ignore_for_file: file_names
@Tags(['golden'])
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/features/content/domain/entities/editor_page.dart';
import 'package:shoot_mobile/features/content/presentation/pages/editor_page_screen.dart';

import '../../helpers/board_content.dart';
import '../../helpers/content_golden.dart';
import '../../helpers/golden.dart';

Widget _screen(EditorPage page) => EditorPageScreen(
  page: page,
  onBrief: () {},
  onCta: (_) {},
  onLink: (_) {},
  onOpenWebsite: () {},
);

void main() {
  for (final variant in Variant.values) {
    testWidgets(
      'MG-US3-S1 screen 35 renders to its board in ${variant.id}',
      (tester) => pumpBoard(
        tester,
        id: '35',
        variant: variant,
        child: _screen(boardPage(arabic: variant.locale.languageCode == 'ar')),
      ),
      skip: !goldensEnabled,
    );
  }

  testWidgets(
    'screen 35 self-baselines: no overflow at 393, 430, iPad and text scale 2',
    (tester) => pumpSelfBaselines(
      tester,
      id: '35',
      child: _screen(boardPage(arabic: false)),
    ),
    skip: !goldensEnabled,
  );

  testWidgets(
    'MG-US3-S3 screen 35 with a second question opened (no board)',
    (tester) => pumpContentState(
      tester,
      name: '35-expanded',
      size: const Size(360, 1100),
      child: _screen(boardPage(arabic: false)),
      before: () => tester.tap(find.text('[QUESTION FROM CMS]').at(1)),
    ),
    skip: !goldensEnabled,
  );
}
