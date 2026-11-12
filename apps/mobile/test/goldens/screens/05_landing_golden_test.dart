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
      'ML-US1-S1 screen 05 renders to its board in ${variant.id}',
      (tester) => pumpBoard(
        tester,
        id: '05',
        variant: variant,
        child: landingScreen(variant),
      ),
      skip: !goldensEnabled,
    );
  }

  testWidgets(
    'screen 05 self-baselines: no overflow at 393, 430, iPad and text scale 2',
    (tester) => pumpSelfBaselines(
      tester,
      id: '05',
      child: landingScreen(Variant.enLight),
    ),
    skip: !goldensEnabled,
  );
}
