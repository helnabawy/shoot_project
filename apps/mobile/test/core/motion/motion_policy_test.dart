import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/motion/deal.dart';
import 'package:shoot_mobile/core/motion/draw_check.dart';
import 'package:shoot_mobile/core/motion/focus_in.dart';
import 'package:shoot_mobile/core/motion/grow.dart';
import 'package:shoot_mobile/core/motion/motion_policy.dart';
import 'package:shoot_mobile/core/motion/rise.dart';
import 'package:shoot_mobile/core/motion/roll.dart';
import 'package:shoot_mobile/core/motion/write_in.dart';
import 'package:shoot_mobile/core/routing/error_page.dart';
import 'package:shoot_mobile/core/routing/not_found_page.dart';

import '../../helpers/pump_app.dart';

final _arrive = <String, Widget>{
  'Rise': const Rise(child: Text('rise')),
  'stagger': Column(children: stagger(const [Text('a'), Text('b'), Text('c')])),
  'FocusIn': const FocusIn(
    child: SizedBox.square(
      dimension: 40,
      child: ColoredBox(color: Colors.brown),
    ),
  ),
  'Roll': const Roll(child: Text('950')),
  'DrawCheck': const DrawCheck(color: Colors.blue, index: 6),
  'Grow': const Grow(
    child: SizedBox(
      width: 100,
      height: 6,
      child: ColoredBox(color: Colors.blue),
    ),
  ),
  'Deal': const Deal(index: 3, child: Text('card')),
  'WriteIn': const WriteIn(child: Text('a sentence')),
  'screen 37': const NotFoundPage(),
  'screen 39': ErrorPage(onRetry: () {}, whatsappNumber: '+971500000000'),
};

Future<Uint8List> _shot(WidgetTester tester) async {
  final boundary = tester.renderObject<RenderRepaintBoundary>(
    find.byKey(const ValueKey('shot')),
  );
  final image = await tester.runAsync(boundary.toImage);
  final bytes = await tester.runAsync(
    () => image!.toByteData(format: ui.ImageByteFormat.rawRgba),
  );
  image!.dispose();
  return bytes!.buffer.asUint8List();
}

void main() {
  test('the budget is 5 seconds', () {
    expect(
      const MotionPolicy(reduced: false).selfStartedBudget,
      const Duration(seconds: 5),
    );
  });

  for (final MapEntry(key: name, value: widget) in _arrive.entries) {
    testWidgets('MF-US4-S1 $name: self-started motion ends within 5 seconds', (
      tester,
    ) async {
      await tester.pumpApp(widget);
      // Frame by frame through the 5 s budget, as a device draws them.
      for (var i = 0; i < 50; i++) {
        await tester.pump(const Duration(milliseconds: 100));
      }
      expect(
        SchedulerBinding.instance.transientCallbackCount,
        0,
        reason: 'a ticker is still running',
      );
      expect(
        tester.binding.hasScheduledFrame,
        isFalse,
        reason: 'frames are still scheduled',
      );
    });

    testWidgets(
      'MF-US4-S2 $name: with reduced motion the first frame is the finished state',
      (tester) async {
        tester.platformDispatcher.accessibilityFeaturesTestValue =
            const FakeAccessibilityFeatures(disableAnimations: true);
        addTearDown(tester.platformDispatcher.clearAllTestValues);
        await tester.pumpApp(
          RepaintBoundary(key: const ValueKey('shot'), child: widget),
        );
        final first = await _shot(tester);
        expect(
          SchedulerBinding.instance.transientCallbackCount,
          0,
          reason: 'nothing animates',
        );
        await tester.pump(const Duration(seconds: 5));
        final settled = await _shot(tester);
        expect(first, settled);
      },
    );
  }
}
