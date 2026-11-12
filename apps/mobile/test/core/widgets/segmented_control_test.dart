import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/widgets/segmented_control.dart';

import '../../helpers/pump_app.dart';

void main() {
  Future<void> pump(WidgetTester tester, List<(int, String)> segments) async {
    tester.view.physicalSize = const Size(360, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    int selected = 0;
    await tester.pumpApp(
      Scaffold(
        body: Padding(
          padding: const EdgeInsets.all(16),
          child: StatefulBuilder(
            builder: (context, setState) => SegmentedControl<int>(
              segments: segments,
              selected: selected,
              onChanged: (v) => setState(() => selected = v),
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  double top(WidgetTester tester, String label) =>
      tester.getTopLeft(find.text(label)).dy;

  testWidgets('short labels sit side by side in equal segments', (
    tester,
  ) async {
    await pump(tester, const [(0, 'Photos'), (1, 'Video')]);
    expect(top(tester, 'Photos'), top(tester, 'Video'));
  });

  testWidgets(
    'a label too long for one line stacks the options as full-width rows',
    (tester) async {
      await pump(tester, const [
        (0, 'Photographer'),
        (1, 'Videographer'),
        (2, 'Photographer and Videographer'),
      ]);
      expect(
        top(tester, 'Photographer'),
        lessThan(top(tester, 'Videographer')),
      );
      expect(
        top(tester, 'Videographer'),
        lessThan(top(tester, 'Photographer and Videographer')),
      );
      // Each label keeps to one line.
      expect(
        tester.getSize(find.text('Photographer and Videographer')).height,
        lessThan(30),
      );
      await tester.tap(find.text('Videographer'));
      await tester.pump();
      final seg = tester.widget<SegmentedControl<int>>(
        find.byType(SegmentedControl<int>),
      );
      expect(seg.selected, 1);
    },
  );
}
