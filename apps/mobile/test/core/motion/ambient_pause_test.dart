import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/motion/ambient_pause.dart';
import 'package:shoot_mobile/core/motion/glint.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon_button.dart';

import '../../helpers/pump_app.dart';

Widget _loops() => AmbientPause(
  child: Column(
    children: [
      const AmbientPauseButton(
        pauseLabel: 'Pause motion',
        playLabel: 'Play motion',
      ),
      Ambient(
        period: const Duration(seconds: 7),
        builder: (_, t) => Opacity(opacity: .5 + t / 2, child: const Text('a')),
      ),
      Ambient(
        period: const Duration(seconds: 14),
        reverse: true,
        builder: (_, t) => Text('b $t'),
      ),
    ],
  ),
);

void main() {
  testWidgets(
    'MF-US4-S3 the Pause control stops every ambient loop, and Play restarts them',
    (tester) async {
      await tester.pumpApp(_loops());
      await tester.pump(const Duration(milliseconds: 100));
      expect(SchedulerBinding.instance.transientCallbackCount, greaterThan(0));

      await tester.tap(find.byType(ShootIconButton));
      await tester.pump();
      // Let the button's ink splash finish: it is the only other thing moving.
      await tester.pump(const Duration(seconds: 1));
      expect(SchedulerBinding.instance.transientCallbackCount, 0);
      expect(find.bySemanticsLabel('Play motion'), findsOneWidget);

      await tester.tap(find.byType(ShootIconButton));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      expect(SchedulerBinding.instance.transientCallbackCount, greaterThan(0));
      await tester.pumpWidget(const SizedBox());
    },
  );

  testWidgets('MF-US4-S3 with reduced motion ambient loops never start', (
    tester,
  ) async {
    tester.platformDispatcher.accessibilityFeaturesTestValue =
        const FakeAccessibilityFeatures(disableAnimations: true);
    addTearDown(tester.platformDispatcher.clearAllTestValues);
    await tester.pumpApp(_loops());
    await tester.pump(const Duration(milliseconds: 100));
    expect(SchedulerBinding.instance.transientCallbackCount, 0);
  });

  testWidgets('an ambient loop without an AmbientPause above it is an error', (
    tester,
  ) async {
    await tester.pumpApp(
      Ambient(
        period: const Duration(seconds: 1),
        builder: (_, _) => const SizedBox(),
      ),
    );
    expect(tester.takeException(), isA<AssertionError>());
  });

  testWidgets('the glint crosses once and is gone by 3.5 s', (tester) async {
    await tester.pumpApp(const Glint(child: SizedBox(width: 300, height: 50)));
    expect(find.byType(Stack), findsNothing);
    await tester.pump(const Duration(milliseconds: 2400));
    await tester.pump(const Duration(milliseconds: 500));
    expect(
      find.descendant(of: find.byType(Glint), matching: find.byType(Stack)),
      findsOneWidget,
    );
    await tester.pump(const Duration(milliseconds: 700));
    expect(
      find.descendant(of: find.byType(Glint), matching: find.byType(Stack)),
      findsNothing,
    );
    expect(SchedulerBinding.instance.transientCallbackCount, 0);
  });
}
