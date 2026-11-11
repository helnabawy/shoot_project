import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon_button.dart';

import '../../helpers/pump_app.dart';

void main() {
  testWidgets(
    'the icon button is 44 x 44 and announces its label as a button',
    (tester) async {
      var tapped = 0;
      final semantics = tester.ensureSemantics();
      await tester.pumpApp(
        Scaffold(
          body: Center(
            child: ShootIconButton(
              icon: ShootIcons.back,
              label: 'Back',
              onPressed: () => tapped++,
            ),
          ),
        ),
      );
      expect(tester.getSize(find.byType(ShootIconButton)), const Size(44, 44));
      expect(
        tester.getSemantics(find.byType(ShootIconButton)),
        isSemantics(
          label: 'Back',
          isButton: true,
          hasEnabledState: true,
          isEnabled: true,
          hasTapAction: true,
        ),
      );
      await tester.tap(find.byType(ShootIconButton));
      expect(tapped, 1);
      semantics.dispose();
    },
  );

  testWidgets('the text action is 44 high, 10 px padded, 15/500 text', (
    tester,
  ) async {
    await tester.pumpApp(
      Scaffold(
        body: Center(
          child: ShootTextAction(
            text: 'عربي',
            label: 'Switch to Arabic',
            onPressed: () {},
          ),
        ),
      ),
    );
    final size = tester.getSize(find.byType(ShootTextAction));
    final text = tester.getSize(find.text('عربي'));
    expect(size.height, 44);
    expect(size.width, text.width + 20);
    final style = tester.widget<Text>(find.text('عربي')).style!;
    expect((style.fontSize, style.fontWeight), (15, FontWeight.w500));
  });

  testWidgets('a disabled button is announced as disabled', (tester) async {
    final semantics = tester.ensureSemantics();
    await tester.pumpApp(
      const Scaffold(
        body: Center(
          child: ShootIconButton(
            icon: ShootIcons.back,
            label: 'Back',
            onPressed: null,
          ),
        ),
      ),
    );
    expect(
      tester.getSemantics(find.byType(ShootIconButton)),
      isSemantics(label: 'Back', isButton: true, hasEnabledState: true),
    );
    semantics.dispose();
  });
}
