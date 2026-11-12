import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/widgets/otp_code_input.dart';

import '../../helpers/pump_app.dart';

void main() {
  Future<List<String>> pump(
    WidgetTester tester, {
    Locale locale = const Locale('en'),
    bool error = false,
    TextEditingController? controller,
  }) async {
    final completed = <String>[];
    await tester.pumpApp(
      Scaffold(
        body: Padding(
          padding: const EdgeInsets.all(20),
          child: OtpCodeInput(
            label: 'Six-digit code',
            controller: controller,
            error: error,
            onCompleted: completed.add,
          ),
        ),
      ),
      locale: locale,
    );
    return completed;
  }

  group('OT-US1-S10 the code cells offer one-time-code autofill and a pasted code fills all six', () {
    testWidgets('OT-US1-S10 the hidden field has the one-time-code hint, a number keyboard and max length 6, '
        'inside an AutofillGroup', (tester) async {
      await pump(tester);
      final field = tester.widget<TextField>(find.byType(TextField));
      expect(field.autofillHints, [AutofillHints.oneTimeCode]);
      expect(field.keyboardType, TextInputType.number);
      expect(field.maxLength, 6);
      expect(
        find.ancestor(
          of: find.byType(TextField),
          matching: find.byType(AutofillGroup),
        ),
        findsOneWidget,
      );
    });

    testWidgets(
      'OT-US1-S10 a pasted or autofilled 482713 fills six cells and fires onCompleted',
      (tester) async {
        final completed = await pump(tester);
        await tester.enterText(find.byType(TextField), '482713');
        await tester.pump();
        expect(completed, ['482713']);
        for (final digit in '482713'.split('')) {
          expect(find.text(digit), findsWidgets);
        }
      },
    );

    testWidgets('OT-US1-S10 letters and extra digits are dropped', (
      tester,
    ) async {
      final controller = TextEditingController();
      addTearDown(controller.dispose);
      final completed = await pump(tester, controller: controller);
      await tester.enterText(find.byType(TextField), '48a2713999');
      await tester.pump();
      expect(controller.text, '482713');
      expect(completed, ['482713']);
    });

    testWidgets(
      'OT-US1-S10 cells are 56 high (board 21 .box) and 1 px outside it',
      (tester) async {
        await pump(tester);
        final cells = find.descendant(
          of: find.byType(OtpCodeInput),
          matching: find.byWidgetPredicate(
            (w) => w is Container && w.decoration is BoxDecoration,
          ),
        );
        expect(cells, findsNWidgets(6));
        // CSS content-box: 56 inside a 1 px border.
        expect(tester.getSize(cells.first).height, 58);

        await tester.tap(find.byType(OtpCodeInput));
        await tester.pump();
        // The next cell to fill has a 2 px focus border.
        expect(tester.getSize(cells.first).height, 60);
      },
    );

    testWidgets(
      'OT-US1-S10 the error cells are 56 high, border included (board 22)',
      (tester) async {
        await pump(tester, error: true);
        final cells = find.descendant(
          of: find.byType(OtpCodeInput),
          matching: find.byWidgetPredicate(
            (w) => w is Container && w.decoration is BoxDecoration,
          ),
        );
        expect(tester.getSize(cells.first).height, 56);
        final row = tester.getSize(find.byType(OtpCodeInput)).width;
        expect(
          tester.getSize(cells.first).width,
          closeTo((row - 40) / 6, 0.01),
        );
      },
    );

    testWidgets('OT-US1-S10 one semantics node named "Six-digit code"', (
      tester,
    ) async {
      final handle = tester.ensureSemantics();
      await pump(tester);
      expect(find.bySemanticsLabel(RegExp('Six-digit code')), findsOneWidget);
      handle.dispose();
    });

    testWidgets('OT-US1-S10 cells stay left to right in Arabic', (
      tester,
    ) async {
      await pump(tester, locale: const Locale('ar'));
      await tester.enterText(find.byType(TextField), '48');
      await tester.pump();
      final four = tester.getCenter(find.text('4'));
      final eight = tester.getCenter(find.text('8'));
      expect(four.dx, lessThan(eight.dx));
    });
  });

  testWidgets('digits only: the input formatters', (tester) async {
    await pump(tester);
    final field = tester.widget<TextField>(find.byType(TextField));
    expect(
      field.inputFormatters!.whereType<FilteringTextInputFormatter>(),
      isNotEmpty,
    );
  });
}
