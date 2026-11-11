import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/gallery/catalogue.dart';

import 'pump_app.dart';

/// Pumps one catalogue state at phone width (360) in [locale], scrolling when it is tall.
Future<void> pumpState(
  WidgetTester tester,
  CatalogueEntry entry,
  WidgetBuilder build, {
  Locale locale = const Locale('en'),
  double textScale = 1,
}) async {
  tester.view
    ..physicalSize = const Size(360, 780)
    ..devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  // A fresh tree, so the app cubits are created again with this locale.
  await tester.pumpWidget(const SizedBox());
  await tester.pumpApp(
    Builder(
      builder: (context) => MediaQuery(
        data: MediaQuery.of(context)
            .copyWith(textScaler: TextScaler.linear(textScale)),
        child: Scaffold(
          body: SingleChildScrollView(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Align(
                alignment: AlignmentDirectional.topStart,
                child: KeyedSubtree(
                  key: const ValueKey('sample'),
                  child: Builder(builder: build),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
    locale: locale,
  );
  if (entry.animates) {
    await tester.pump(const Duration(milliseconds: 100));
  } else {
    await tester.pumpAndSettle();
  }
}
