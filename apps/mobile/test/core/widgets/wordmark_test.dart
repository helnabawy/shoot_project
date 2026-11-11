import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/theme/shoot_colors.dart';
import 'package:shoot_mobile/core/widgets/wordmark.dart';

import '../../helpers/pump_app.dart';

void main() {
  testWidgets('draws the brand as 22/700 ink type, 22 high, as a home link', (
    tester,
  ) async {
    var tapped = 0;
    final semantics = tester.ensureSemantics();
    await tester.pumpApp(
      Scaffold(
        body: Center(
          child: Wordmark(label: 'Shoot', onTap: () => tapped++),
        ),
      ),
    );
    final text = tester.widget<Text>(
      find.byKey(const ValueKey('fidelity:wordmark')),
    );
    expect(text.style?.fontSize, 22);
    expect(text.style?.fontWeight, FontWeight.w700);
    expect(text.style?.color, ShootColors.light.ink);
    expect(
      tester.getSize(find.byKey(const ValueKey('fidelity:wordmark'))).height,
      22,
    );
    expect(
      tester.getSemantics(find.byType(Wordmark)),
      isSemantics(label: 'Shoot', isLink: true),
    );
    await tester.tap(find.byType(Wordmark));
    expect(tapped, 1);
    semantics.dispose();
  });
}
