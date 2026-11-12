import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/widgets/choice_row_group.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';

import '../../helpers/pump_app.dart';

void main() {
  Future<List<String>> pump(
    WidgetTester tester, {
    Locale locale = const Locale('en'),
    String selected = 'seeker',
  }) async {
    final chosen = <String>[];
    await tester.pumpApp(
      Scaffold(
        body: SizedBox(
          width: 320,
          child: ChoiceRowGroup<String>(
            label: 'I am',
            selected: selected,
            onChanged: chosen.add,
            rows: const [
              (value: 'seeker', label: 'I need a pro', icon: ShootIcons.search),
              (value: 'provider', label: "I'm a pro", icon: ShootIcons.person),
            ],
          ),
        ),
      ),
      locale: locale,
    );
    return chosen;
  }

  testWidgets('rows are at least 44 high with 7 8 padding, radius 9', (
    tester,
  ) async {
    await pump(tester);
    final row = find.ancestor(
      of: find.text('I need a pro'),
      matching: find.byWidgetPredicate(
        (w) => w is Container && w.padding != null,
      ),
    );
    expect(tester.getSize(row.first).height, greaterThanOrEqualTo(44));
    final box = tester.widget<Container>(row.first);
    expect(
      box.padding,
      const EdgeInsetsDirectional.symmetric(horizontal: 8, vertical: 7),
    );
    expect(
      (box.decoration! as BoxDecoration).borderRadius,
      BorderRadius.circular(9),
    );
  });

  testWidgets('the chosen row is selected with accentInk text and a tick', (
    tester,
  ) async {
    await pump(tester);
    final context = tester.element(find.text('I need a pro'));
    expect(
      tester.widget<Text>(find.text('I need a pro')).style!.color,
      context.colors.accentInk,
    );
    expect(
      tester.widget<Text>(find.text("I'm a pro")).style!.color,
      context.colors.ink,
    );
    expect(
      find.byWidgetPredicate(
        (w) => w is ShootIcon && w.icon == ShootIcons.check,
      ),
      findsOneWidget,
    );
  });

  testWidgets('a radio group for screen readers; tapping a row chooses it', (
    tester,
  ) async {
    final handle = tester.ensureSemantics();
    final chosen = await pump(tester);
    expect(
      tester.getSemantics(find.bySemanticsLabel('I need a pro')),
      isSemantics(
        label: 'I need a pro',
        isInMutuallyExclusiveGroup: true,
        hasCheckedState: true,
        isChecked: true,
        hasTapAction: true,
      ),
    );
    expect(
      tester.getSemantics(find.bySemanticsLabel("I'm a pro")),
      isSemantics(
        label: "I'm a pro",
        isInMutuallyExclusiveGroup: true,
        hasCheckedState: true,
        isChecked: false,
        hasTapAction: true,
      ),
    );
    expect(find.bySemanticsLabel('I am'), findsOneWidget);

    await tester.tap(find.text("I'm a pro"));
    expect(chosen, ['provider']);
    handle.dispose();
  });

  testWidgets('mirrors in Arabic: the tile at the inline start', (
    tester,
  ) async {
    await pump(tester, locale: const Locale('ar'));
    final text = tester.getCenter(find.text('I need a pro'));
    final tile = tester.getCenter(
      find.byWidgetPredicate(
        (w) => w is ShootIcon && w.icon == ShootIcons.search,
      ),
    );
    expect(tile.dx, greaterThan(text.dx));
  });

  testWidgets('grows at text scale 2.0 without overflow', (tester) async {
    tester.platformDispatcher.textScaleFactorTestValue = 2;
    addTearDown(tester.platformDispatcher.clearAllTestValues);
    await pump(tester);
    expect(tester.takeException(), isNull);
  });
}
