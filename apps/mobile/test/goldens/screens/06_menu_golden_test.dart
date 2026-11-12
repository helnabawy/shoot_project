// The plan names screen goldens by board number (`<id>_<name>_golden_test.dart`).
// ignore_for_file: file_names
@Tags(['golden'])
library;

import 'package:flutter_test/flutter_test.dart';

import '../../helpers/golden.dart';
import '../../helpers/ml_golden.dart';

void main() {
  for (final variant in Variant.values) {
    testWidgets(
      'ML-US3-S1 screen 06 renders to its board in ${variant.id}',
      (tester) => pumpBoard(
        tester,
        id: '06',
        variant: variant,
        child: menuScreen(variant),
      ),
      skip: !goldensEnabled,
    );
  }

  testWidgets(
    'screen 06 self-baselines: no overflow at 393, 430, iPad and text scale 2',
    (tester) =>
        pumpSelfBaselines(tester, id: '06', child: menuScreen(Variant.enLight)),
    skip: !goldensEnabled,
  );
}
