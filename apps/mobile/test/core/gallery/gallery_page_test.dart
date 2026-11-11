import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/gallery/catalogue.dart';
import 'package:shoot_mobile/core/gallery/gallery_page.dart';

import '../../helpers/pump_app.dart';

void main() {
  testWidgets(
    'MF-US3-S1 the gallery shows every catalogue component in every state',
    (tester) async {
      // Tall enough that the list builds every section at once.
      tester.view
        ..physicalSize = const Size(400, 30000)
        ..devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      await tester.pumpApp(const GalleryPage());
      await tester.pump(const Duration(milliseconds: 100));

      for (final entry in catalogue) {
        expect(find.text(entry.name), findsWidgets, reason: entry.name);
        for (final state in entry.states.keys) {
          expect(
            find.text(state),
            findsWidgets,
            reason: '${entry.name}: $state',
          );
        }
      }
    },
  );

  test('the catalogue covers every component in the contract', () {
    const contract = [
      'ShootHeader',
      'Wordmark',
      'ShootIconButton',
      'TopHit',
      'SecondaryButton',
      'TextLink',
      'ShootPanel',
      'FloatingPanel',
      'ShootSheet',
      'GroupLabel',
      'ShootRow',
      'SummaryRow',
      'IconTile',
      'PhotoTile',
      'ShootField',
      'ShootTextArea',
      'PickerField',
      'ShootChip',
      'SegmentedControl',
      'PhoneField',
      'OtpCodeInput',
      'StatusBadge',
      'QuoteLines',
      'Money',
      'ProgressBar',
      'StepStrip',
      'MessageBanner',
      'CalendarMonth',
      'CreatorCard',
      'SnapCarousel',
      'EmptyState',
      'RichContent',
      'SceneTile',
      'GoldenHourScene',
    ];
    final names = catalogue.map((e) => e.name).toSet();
    for (final name in contract) {
      expect(names, contains(name));
    }
  });
}
