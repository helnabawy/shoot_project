import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/theme/shoot_colors.dart';
import 'package:shoot_mobile/core/widgets/icon_tile.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';

import '../../helpers/pump_app.dart';

void main() {
  testWidgets('the row tile is 30, radius 8, surfaceSunk, 16 px tileInk icon', (
    tester,
  ) async {
    await tester.pumpApp(const Center(child: IconTile(ShootIcons.person)));
    expect(tester.getSize(find.byType(IconTile)), const Size(30, 30));
    final box =
        tester.widget<Container>(find.byType(Container)).decoration!
            as BoxDecoration;
    expect(box.color, ShootColors.light.surfaceSunk);
    expect(box.borderRadius, BorderRadius.circular(8));
    final icon = tester.widget<ShootIcon>(find.byType(ShootIcon));
    expect((icon.size, icon.color), (16, ShootColors.light.tileInk));
  });

  testWidgets('the large tile is 44, radius 10, with a 20 px icon', (
    tester,
  ) async {
    await tester.pumpApp(
      const Center(child: IconTile.large(ShootIcons.searchQuestion)),
    );
    expect(tester.getSize(find.byType(IconTile)), const Size(44, 44));
    expect(tester.widget<ShootIcon>(find.byType(ShootIcon)).size, 20);
  });
}
