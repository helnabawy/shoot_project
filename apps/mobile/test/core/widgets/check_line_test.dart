import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/widgets/check_line.dart';
import 'package:shoot_mobile/core/widgets/linked_text.dart';

import '../../helpers/pump_app.dart';

void main() {
  const label = 'I accept the Terms and the Privacy Policy.';

  Future<(List<bool>, List<String>)> pump(
    WidgetTester tester, {
    Locale locale = const Locale('en'),
    bool checked = false,
  }) async {
    final changes = <bool>[];
    final opened = <String>[];
    await tester.pumpApp(
      Scaffold(
        body: SizedBox(
          width: 320,
          child: CheckLine(
            template: 'I accept the {terms} and the {privacy}.',
            label: label,
            checked: checked,
            onChanged: changes.add,
            parts: {
              'terms': LinkedText.link('Terms', () => opened.add('terms')),
              'privacy': LinkedText.link(
                'Privacy Policy',
                () => opened.add('privacy'),
              ),
            },
          ),
        ),
      ),
      locale: locale,
    );
    return (changes, opened);
  }

  Finder box() => find.descendant(
    of: find.byType(CheckLine),
    matching: find.byWidgetPredicate(
      (w) => w is Container && w.constraints?.maxWidth == 22,
    ),
  );

  testWidgets(
    'a 22 px box beside 14/1.5 text, a 44 px target for the whole line',
    (tester) async {
      await pump(tester);
      expect(tester.getSize(box()), const Size(22, 22));
      final handle = tester.ensureSemantics();
      await tester.pump();
      expect(
        tester.getSemantics(find.bySemanticsLabel(label)).rect.height,
        greaterThanOrEqualTo(44),
      );
      handle.dispose();
      final rich = tester.widget<RichText>(
        find.descendant(
          of: find.byType(LinkedText),
          matching: find.byType(RichText),
        ),
      );
      expect(rich.text.style!.fontSize, 14);
      expect(rich.text.style!.height, 1.5);
      expect(rich.text.style!.fontFamily, isNotNull);
    },
  );

  testWidgets('tapping the line toggles the box', (tester) async {
    final (changes, opened) = await pump(tester);
    await tester.tap(box());
    expect(changes, [true]);
    expect(opened, isEmpty);
  });

  testWidgets(
    'inline links are their own semantics nodes and open their page',
    (tester) async {
      final handle = tester.ensureSemantics();
      final (changes, opened) = await pump(tester, checked: true);
      expect(
        tester.getSemantics(find.bySemanticsLabel(label)),
        isSemantics(
          label: label,
          hasCheckedState: true,
          isChecked: true,
          hasTapAction: true,
        ),
      );
      final terms = find.semantics.byLabel('Terms');
      expect(terms.evaluate(), hasLength(1));
      expect(find.semantics.byLabel('Privacy Policy').evaluate(), hasLength(1));
      expect(
        terms.evaluate().single,
        isSemantics(label: 'Terms', isLink: true, hasTapAction: true),
      );
      tester.semantics.tap(terms);
      expect(opened, ['terms']);
      expect(changes, isEmpty);
      handle.dispose();
    },
  );

  testWidgets('the box sits at the inline start in Arabic', (tester) async {
    await pump(tester, locale: const Locale('ar'));
    expect(
      tester.getCenter(box()).dx,
      greaterThan(tester.getCenter(find.byType(LinkedText)).dx),
    );
  });

  testWidgets('wraps at text scale 2.0 without overflow', (tester) async {
    tester.platformDispatcher.textScaleFactorTestValue = 2;
    addTearDown(tester.platformDispatcher.clearAllTestValues);
    await pump(tester);
    expect(tester.takeException(), isNull);
  });
}
