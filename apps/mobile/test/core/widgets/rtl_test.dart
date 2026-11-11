import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/gallery/catalogue.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';

import '../../helpers/catalogue_harness.dart';

Map<String, Rect> _textRects(WidgetTester tester) {
  final sample = find.byKey(const ValueKey('sample'));
  final origin = tester.getRect(sample);
  final out = <String, Rect>{};
  for (final e
      in find.descendant(of: sample, matching: find.byType(Text)).evaluate()) {
    final text = (e.widget as Text).data;
    if (text == null || out.containsKey(text)) continue;
    out[text] = tester.getRect(find.byWidget(e.widget)).shift(-origin.topLeft);
  }
  return out;
}

void main() {
  for (final entry in catalogue.where((e) => !e.alwaysLtr)) {
    for (final MapEntry(key: state, value: build) in entry.states.entries) {
      testWidgets(
        'MF-US3-S2 ${entry.name} ($state) lays out right to left as a mirror',
        (tester) async {
          await pumpState(tester, entry, build);
          final width = tester
              .getSize(find.byKey(const ValueKey('sample')))
              .width;
          final ltr = _textRects(tester);
          await pumpState(tester, entry, build, locale: const Locale('ar'));
          final rtl = _textRects(tester);
          for (final MapEntry(key: text, value: r) in ltr.entries) {
            final m = rtl[text];
            if (m == null || !entry.mirrors) continue;
            expect(
              m.left,
              closeTo(width - r.right, 1.5),
              reason: '"$text" should sit at the mirrored position',
            );
          }
          // Direction icons mirror in Arabic.
          for (final e in find.byType(ShootIcon).evaluate()) {
            final icon = e.widget as ShootIcon;
            if (!icon.icon.directional) continue;
            expect(
              find.descendant(
                of: find.byWidget(icon),
                matching: find.byType(Transform),
              ),
              findsWidgets,
              reason: '${icon.icon.name} mirrors',
            );
          }
        },
      );
    }
  }

  test('MF-US3-S2 widgets use logical edges and hold no user-visible text', () {
    final files = Directory('lib/core/widgets')
        .listSync()
        .whereType<File>()
        .where(
          (f) => f.path.endsWith('.dart') && !f.path.endsWith('_svg.dart'),
        );
    final physical = RegExp(
      r'EdgeInsets\.only\(\s*(left|right)|Alignment\.(centerLeft|centerRight|topLeft|topRight|bottomLeft|bottomRight)|Positioned\(\s*(left|right)',
    );
    final literalText = RegExp(r'''Text\(\s*['"](?!\$)[^'"]*[A-Za-z؀-ۿ]''');
    for (final f in files) {
      final src = f.readAsStringSync();
      expect(
        physical.hasMatch(src),
        isFalse,
        reason: '${f.path} uses a physical edge',
      );
      expect(
        literalText.hasMatch(src),
        isFalse,
        reason: '${f.path} holds copy (FR-015)',
      );
    }
  });
}
