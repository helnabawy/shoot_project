import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/gallery/catalogue.dart';

import '../../helpers/catalogue_harness.dart';

void main() {
  for (final entry in catalogue) {
    for (final MapEntry(key: state, value: build) in entry.states.entries) {
      testWidgets(
        'MF-US3-S3 ${entry.name} ($state) wraps at text scale 2 and keeps 44 px targets',
        (tester) async {
          final semantics = tester.ensureSemantics();
          await pumpState(tester, entry, build, textScale: 2);
          expect(tester.takeException(), isNull, reason: 'no overflow');

          final root = tester.getSemantics(
            find.byKey(const ValueKey('sample')),
          );
          final small = <String>[];
          void visit(SemanticsNode n) {
            final d = n.getSemanticsData();
            if (d.hasAction(SemanticsAction.tap) && !n.isInvisible) {
              final r = n.rect;
              if (r.width < 44 - .5 || r.height < 44 - .5) {
                small.add('"${d.label}" ${r.size}');
              }
            }
            n.visitChildren((c) {
              visit(c);
              return true;
            });
          }

          visit(root);
          expect(small, isEmpty, reason: 'targets under 44 x 44');
          semantics.dispose();
        },
      );
    }
  }
}
