import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/theme/shoot_colors.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';
import 'package:shoot_mobile/core/widgets/top_hit.dart';

import '../../helpers/pump_app.dart';

Color _fill(WidgetTester tester) =>
    (tester
                .widget<AnimatedContainer>(find.byType(AnimatedContainer))
                .decoration!
            as BoxDecoration)
        .color!;

void main() {
  Future<void> pump(WidgetTester tester, TopHit hit) => tester.pumpApp(
    Scaffold(
      body: Padding(padding: const EdgeInsets.all(20), child: hit),
    ),
  );

  testWidgets('is 50 high, radius 9, primary red with 17/600 onPrimary text', (
    tester,
  ) async {
    await pump(tester, TopHit(label: 'Start a brief', onPressed: () {}));
    final key = find.byKey(const ValueKey('fidelity:topHit'));
    expect(tester.getSize(key).height, 50);
    expect(_fill(tester), ShootColors.light.primary);
    final style = tester.widget<Text>(find.text('Start a brief')).style!;
    expect(style.fontSize, 17);
    expect(style.fontWeight, FontWeight.w600);
    expect(style.color, ShootColors.light.onPrimary);
  });

  testWidgets('pressed uses primaryHover; release restores primary', (
    tester,
  ) async {
    var tapped = 0;
    await pump(tester, TopHit(label: 'Go', onPressed: () => tapped++));
    final gesture = await tester.startGesture(
      tester.getCenter(find.byType(TopHit)),
    );
    await tester.pump();
    expect(_fill(tester), ShootColors.light.primaryHover);
    await gesture.up();
    await tester.pumpAndSettle();
    expect(_fill(tester), ShootColors.light.primary);
    expect(tapped, 1);
  });

  testWidgets('disabled and loading ignore taps; loading shows progress', (
    tester,
  ) async {
    await pump(tester, const TopHit(label: 'Go', onPressed: null));
    expect(_fill(tester).a, lessThan(1));

    var tapped = 0;
    await pump(
      tester,
      TopHit(label: 'Go', onPressed: () => tapped++, loading: true),
    );
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    await tester.tap(find.byType(TopHit));
    expect(tapped, 0);
  });

  testWidgets(
    'start layout: leading icon, label, price and chevron; the price is read',
    (tester) async {
      final semantics = tester.ensureSemantics();
      await pump(
        tester,
        TopHit(
          label: 'Book',
          onPressed: () {},
          leading: ShootIcons.calendar,
          price: 'AED 950',
          chevron: true,
        ),
      );
      final hit = tester.getRect(find.byType(TopHit));
      expect(tester.getTopLeft(find.byType(ShootIcon).first).dx, hit.left + 12);
      expect(find.text('AED 950'), findsOneWidget);
      expect(
        tester.getSemantics(find.byType(TopHit)),
        isSemantics(label: 'Book, AED 950', isButton: true),
      );
      semantics.dispose();
    },
  );

  testWidgets('centred layout centres the label', (tester) async {
    await pump(
      tester,
      TopHit(label: 'Start a brief', onPressed: () {}, centered: true),
    );
    expect(
      tester.getCenter(find.text('Start a brief')).dx,
      closeTo(tester.getCenter(find.byType(TopHit)).dx, 0.5),
    );
  });
}
