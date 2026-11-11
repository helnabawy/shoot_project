// The plan names screen goldens by board number (`<id>_<name>_golden_test.dart`).
// ignore_for_file: file_names
@Tags(['golden'])
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/routing/not_found_page.dart';

import '../../helpers/golden.dart';

void main() {
  for (final variant in Variant.values) {
    testWidgets(
      'MF-US1-S1 screen 37 renders to its board in ${variant.id}',
      (tester) => pumpBoard(
        tester,
        id: '37',
        variant: variant,
        child: const NotFoundPage(),
      ),
      skip: !goldensEnabled,
    );
  }

  testWidgets(
    'screen 37 self-baselines: no overflow at 393, 430, iPad and text scale 2',
    (tester) =>
        pumpSelfBaselines(tester, id: '37', child: const NotFoundPage()),
    skip: !goldensEnabled,
  );
}
