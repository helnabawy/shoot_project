import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/widgets/inline_error.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';

import '../../helpers/pump_app.dart';

void main() {
  const message =
      "That code isn't right. Check the text we sent and type it again.";

  Future<void> pump(
    WidgetTester tester, {
    Locale locale = const Locale('en'),
  }) => tester.pumpApp(
    const Scaffold(body: SizedBox(width: 320, child: InlineError(message))),
    locale: locale,
  );

  testWidgets('15/1.45 onDanger text beside an 18 px alert icon', (
    tester,
  ) async {
    await pump(tester);
    final text = tester.widget<Text>(find.text(message));
    final context = tester.element(find.text(message));
    expect(text.style!.fontSize, 15);
    expect(text.style!.height, 1.45);
    expect(text.style!.color, context.colors.onDanger);
    final icon = tester.widget<ShootIcon>(find.byType(ShootIcon));
    expect(icon.icon, ShootIcons.alert);
    expect(icon.size, 18);
  });

  testWidgets('a live region, read out when it appears', (tester) async {
    final handle = tester.ensureSemantics();
    await pump(tester);
    expect(
      tester.getSemantics(find.bySemanticsLabel(message)),
      isSemantics(label: message, isLiveRegion: true),
    );
    handle.dispose();
  });

  testWidgets('the icon sits at the inline start in Arabic', (tester) async {
    await pump(tester, locale: const Locale('ar'));
    expect(
      tester.getCenter(find.byType(ShootIcon)).dx,
      greaterThan(tester.getCenter(find.text(message)).dx),
    );
  });

  testWidgets('wraps at text scale 2.0 without overflow', (tester) async {
    tester.platformDispatcher.textScaleFactorTestValue = 2;
    addTearDown(tester.platformDispatcher.clearAllTestValues);
    await pump(tester);
    expect(tester.takeException(), isNull);
  });
}
