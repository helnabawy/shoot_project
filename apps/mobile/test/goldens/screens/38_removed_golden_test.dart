// The plan names screen goldens by board number (`<id>_<name>_golden_test.dart`).
// ignore_for_file: file_names
@Tags(['golden'])
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/features/content/presentation/pages/removed_page.dart';

import '../../helpers/golden.dart';

void main() {
  for (final variant in Variant.values) {
    testWidgets(
      'MG-US4-S1 screen 38 renders to its board in ${variant.id}',
      (tester) => pumpBoard(
        tester,
        id: '38',
        variant: variant,
        child: RemovedPage(onWhatsapp: () {}),
      ),
      skip: !goldensEnabled,
    );
  }

  testWidgets(
    'screen 38 self-baselines: no overflow at 393, 430, iPad and text scale 2',
    (tester) => pumpSelfBaselines(
      tester,
      id: '38',
      child: RemovedPage(onWhatsapp: () {}),
    ),
    skip: !goldensEnabled,
  );
}
