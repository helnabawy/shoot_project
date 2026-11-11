// The plan names screen goldens by board number (`<id>_<name>_golden_test.dart`).
// ignore_for_file: file_names
@Tags(['golden'])
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/routing/error_page.dart';

import '../../helpers/golden.dart';

/// The board shows the WhatsApp row, so the golden supplies a site number (feature 008 serves it).
final _page = ErrorPage(onRetry: () {}, whatsappNumber: '+971500000000');

void main() {
  for (final variant in Variant.values) {
    testWidgets(
      'MF-US1-S1 screen 39 renders to its board in ${variant.id}',
      (tester) => pumpBoard(tester, id: '39', variant: variant, child: _page),
      skip: !goldensEnabled,
    );
  }

  testWidgets(
    'screen 39 self-baselines: no overflow at 393, 430, iPad and text scale 2',
    (tester) => pumpSelfBaselines(tester, id: '39', child: _page),
    skip: !goldensEnabled,
  );
}
