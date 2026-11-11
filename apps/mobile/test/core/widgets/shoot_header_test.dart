import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/widgets/shoot_header.dart';

import '../../helpers/pump_app.dart';

void main() {
  Widget header({bool back = false, TextDirection? dir}) => Scaffold(
    body: Directionality(
      textDirection: dir ?? TextDirection.ltr,
      child: ShootHeader(
        leadsWithBack: back,
        leading: const SizedBox(key: Key('lead'), width: 50, height: 22),
        trailing: const [SizedBox(key: Key('trail'), width: 44, height: 44)],
      ),
    ),
  );

  testWidgets(
    'is 58 high with 20 start and 12 end padding, and the fidelity key',
    (tester) async {
      await tester.pumpApp(header());
      final box = tester.getRect(find.byKey(const ValueKey('fidelity:header')));
      expect(box.height, 58);
      expect(tester.getTopLeft(find.byKey(const Key('lead'))).dx, 20);
      expect(
        tester.getTopRight(find.byKey(const Key('trail'))).dx,
        box.right - 12,
      );
    },
  );

  testWidgets('leads with 12 when it starts with a back button', (
    tester,
  ) async {
    await tester.pumpApp(header(back: true));
    expect(tester.getTopLeft(find.byKey(const Key('lead'))).dx, 12);
  });

  testWidgets('mirrors in right to left', (tester) async {
    await tester.pumpApp(header(dir: TextDirection.rtl));
    final box = tester.getRect(find.byKey(const ValueKey('fidelity:header')));
    expect(
      tester.getTopRight(find.byKey(const Key('lead'))).dx,
      box.right - 20,
    );
    expect(tester.getTopLeft(find.byKey(const Key('trail'))).dx, 12);
  });
}
