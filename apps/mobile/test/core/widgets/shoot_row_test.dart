import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/theme/shoot_colors.dart';
import 'package:shoot_mobile/core/widgets/icon_tile.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';
import 'package:shoot_mobile/core/widgets/shoot_row.dart';

import '../../helpers/pump_app.dart';

void main() {
  Future<void> pump(WidgetTester tester, Widget row, {Locale? locale}) =>
      tester.pumpApp(
        Scaffold(body: Column(children: [row])),
        locale: locale ?? const Locale('en'),
      );

  testWidgets(
    'the usual row is min 48, gap 12, 16 px ink, with a mute chevron',
    (tester) async {
      await pump(
        tester,
        ShootRow(
          label: 'Browse creators',
          leading: const IconTile(ShootIcons.person),
          onTap: () {},
        ),
      );
      expect(tester.getSize(find.byType(ShootRow)).height, 48);
      final label = tester.widget<Text>(find.text('Browse creators')).style!;
      expect((label.fontSize, label.color), (16, ShootColors.light.ink));
      final tileRight = tester.getTopRight(find.byType(IconTile)).dx;
      expect(
        tester.getTopLeft(find.text('Browse creators')).dx,
        tileRight + 12,
      );
      final chevron = tester.widget<ShootIcon>(
        find
            .descendant(
              of: find.byType(ShootRow),
              matching: find.byType(ShootIcon),
            )
            .last,
      );
      expect(
        (chevron.icon, chevron.color),
        (ShootIcons.chevron, ShootColors.light.mute),
      );
    },
  );

  testWidgets('hairlines sit outside the min-height, as CSS borders do', (
    tester,
  ) async {
    await pump(
      tester,
      ShootRow(
        label: 'x',
        onTap: () {},
        minHeight: 44,
        padding: EdgeInsetsDirectional.zero,
        divider: RowDivider.topAndBottom,
      ),
    );
    expect(tester.getSize(find.byType(ShootRow)).height, 46);
  });

  testWidgets(
    'selected rows wash and take the accent ink; announced selected',
    (tester) async {
      final semantics = tester.ensureSemantics();
      await pump(
        tester,
        ShootRow(label: 'Weddings', selected: true, onTap: () {}),
      );
      expect(
        tester.widget<Text>(find.text('Weddings')).style!.color,
        ShootColors.light.accentInk,
      );
      expect(
        tester.getSemantics(find.byType(ShootRow)),
        isSemantics(
          label: 'Weddings',
          isLink: true,
          isSelected: true,
          hasSelectedState: true,
        ),
      );
      semantics.dispose();
    },
  );

  testWidgets('the chevron mirrors in Arabic', (tester) async {
    await pump(
      tester,
      ShootRow(label: 'تصفّح', onTap: () {}),
      locale: const Locale('ar'),
    );
    expect(
      find.descendant(
        of: find.byType(ShootIcon),
        matching: find.byWidgetPredicate((w) => w is Transform),
      ),
      findsOneWidget,
    );
  });
}
