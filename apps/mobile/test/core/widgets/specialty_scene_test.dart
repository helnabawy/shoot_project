import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/widgets/scene_tile.dart';
import 'package:shoot_mobile/core/widgets/specialty_scene.dart';

import '../../helpers/pump_app.dart';

Widget _tile(String? scene, {String? glyph}) => Center(
  child: SizedBox(
    width: 132,
    height: 236,
    child: SpecialtyScene(scene: scene, glyph: glyph),
  ),
);

void main() {
  for (final scene in const [
    'wedding',
    'events',
    'portrait',
    'product',
    'property',
    'office',
    'food',
  ]) {
    testWidgets(
      'the CMS scene "$scene" draws its picture, not the plain tile',
      (tester) async {
        await tester.pumpApp(_tile(scene));
        expect(SpecialtyScene.hasDrawing(scene), isTrue);
        expect(find.byKey(ValueKey('specialty-scene:$scene')), findsOneWidget);
        expect(find.byType(SvgPicture), findsOneWidget);
        expect(find.byType(SceneTile), findsNothing);
        expect(tester.takeException(), isNull);
      },
    );
  }

  testWidgets('no scene, or an unknown one, falls back to the plain tile '
      'with the glyph', (tester) async {
    await tester.pumpApp(_tile('teaching', glyph: 'T'));
    expect(SpecialtyScene.hasDrawing('teaching'), isFalse);
    expect(find.byType(SceneTile), findsOneWidget);
    expect(find.byType(SvgPicture), findsNothing);
    expect(find.text('T'), findsOneWidget);

    await tester.pumpApp(_tile(null));
    expect(find.byType(SceneTile), findsOneWidget);
  });
}
