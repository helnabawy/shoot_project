import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/theme/shoot_colors.dart';
import 'package:shoot_mobile/core/widgets/empty_state.dart';
import 'package:shoot_mobile/core/widgets/icon_tile.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';

import '../../helpers/pump_app.dart';

void main() {
  testWidgets('mark, meta, title and body with the board gaps and type', (
    tester,
  ) async {
    await tester.pumpApp(
      const Center(
        child: EmptyState(
          mark: IconTile.large(ShootIcons.searchQuestion),
          meta: '404',
          title: "That page isn't here",
          titleKey: ValueKey('fidelity:h1'),
          body: 'It may have moved, or the creator may have taken their profile down.',
        ),
      ),
    );
    await tester.pumpAndSettle();
    final tile = tester.getRect(find.byType(IconTile));
    final meta = tester.getRect(find.text('404'));
    final title = tester.getRect(find.byKey(const ValueKey('fidelity:h1')));
    expect(meta.top - tile.bottom, 16); // gap 8 + margin 8
    expect(title.top - meta.bottom, 8);

    final titleStyle = tester
        .widget<Text>(find.text("That page isn't here"))
        .style!;
    expect((titleStyle.fontSize, titleStyle.fontWeight), (26, FontWeight.w700));
    final body = find.textContaining('It may have moved');
    expect(tester.getSize(body).width, lessThanOrEqualTo(260));
    final bodyStyle = tester.widget<Text>(body).style!;
    expect(
      (bodyStyle.fontSize, bodyStyle.height, bodyStyle.color),
      (15, 1.6, ShootColors.light.mute),
    );
  });

  testWidgets('without a meta line the title follows the mark after 16', (
    tester,
  ) async {
    await tester.pumpApp(
      const Center(
        child: EmptyState(
          mark: SizedBox.square(key: Key('mark'), dimension: 44),
          title: 'T',
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(
      tester.getRect(find.text('T')).top -
          tester.getRect(find.byKey(const Key('mark'))).bottom,
      16,
    );
  });
}
