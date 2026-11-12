import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

import 'golden.dart';

/// A baseline for a state the canvas has no board for (FR-040): the screen at [size] in [variant],
/// 2x, animations off, saved as `goldens/states/<name>.png` next to the calling test. Flutter-only:
/// there is no reference to diff, so it only guards against change. [before] runs after the first
/// frame (a tap that opens a question, for example).
Future<void> pumpContentState(
  WidgetTester tester, {
  required String name,
  required Widget child,
  Variant variant = Variant.enLight,
  Size size = const Size(360, 780),
  Future<void> Function()? before,
}) async {
  tester.view
    ..physicalSize = size * 2
    ..devicePixelRatio = 2
    ..padding = FakeViewPadding.zero
    ..viewPadding = FakeViewPadding.zero;
  tester.platformDispatcher
    ..textScaleFactorTestValue = 1
    ..accessibilityFeaturesTestValue = const FakeAccessibilityFeatures(
      disableAnimations: true,
    );
  debugDefaultTargetPlatformOverride = TargetPlatform.android;
  debugDisableShadows = false;
  addTearDown(tester.view.reset);
  addTearDown(tester.platformDispatcher.clearAllTestValues);
  try {
    await tester.pumpWidget(
      RepaintBoundary(
        key: const ValueKey('golden'),
        child: goldenShell(child, variant),
      ),
    );
    await tester.pumpAndSettle();
    if (before != null) {
      await before();
      await tester.pumpAndSettle();
    }
    expect(tester.takeException(), isNull, reason: name);
    final boundary = tester.renderObject<RenderRepaintBoundary>(
      find.byKey(const ValueKey('golden')),
    );
    final image = await tester.runAsync(() => boundary.toImage(pixelRatio: 2));
    await expectLater(image, matchesGoldenFile('goldens/states/$name.png'));
    image!.dispose();
  } finally {
    debugDefaultTargetPlatformOverride = null;
    debugDisableShadows = true;
  }
}
