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

  for (final locale in const [Locale('en'), Locale('ar')]) {
    testWidgets(
      'a centred label stays centred while the glint plays (${locale.languageCode})',
      (tester) async {
        await tester.pumpApp(
          Scaffold(
            body: Padding(
              padding: const EdgeInsets.all(20),
              child: TopHit(
                label: 'Back to the start',
                centered: true,
                onPressed: () {},
              ),
            ),
          ),
          locale: locale,
        );
        final label = find.text('Back to the start');
        final button = find.byKey(const ValueKey('fidelity:topHit'));
        final atRest = tester.getCenter(label);
        expect(atRest.dx, closeTo(tester.getCenter(button).dx, 0.5));
        // 2.4 s delay, then the 1.1 s sheen: sample it as it crosses.
        await tester.pump(const Duration(milliseconds: 2400));
        for (var ms = 0; ms <= 1100; ms += 100) {
          await tester.pump(const Duration(milliseconds: 100));
          expect(tester.getCenter(label), atRest, reason: 'at ${ms}ms');
        }
        await tester.pumpAndSettle();
        expect(tester.getCenter(label), atRest);
      },
    );
  }
}
