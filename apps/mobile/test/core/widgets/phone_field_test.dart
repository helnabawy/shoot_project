import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/widgets/phone_field.dart';

import '../../helpers/pump_app.dart';

TextEditingValue _format(String text) => const UaeNationalFormatter()
    .formatEditUpdate(TextEditingValue.empty, TextEditingValue(text: text));

void main() {
  group('UaeNationalFormatter: only the part after the fixed +971', () {
    test('drops a pasted or autofilled country code and the leading 0', () {
      expect(_format('971 50 123 4567').text, '50 123 4567');
      expect(_format('00971 50 123 4567').text, '50 123 4567');
      expect(_format('050 123 4567').text, '50 123 4567');
      expect(_format('0').text, '');
    });

    test(
      'leaves a national number, and a short 971 still being typed, alone',
      () {
        expect(_format('50 123 4567').text, '50 123 4567');
        expect(_format('9715').text, '9715');
        expect(_format('').text, '');
      },
    );

    test('puts the caret at the end of what is left', () {
      expect(
        _format('050').selection,
        const TextSelection.collapsed(offset: 2),
      );
    });
  });

  testWidgets('a pasted +971 number shows once, after the fixed +971', (
    tester,
  ) async {
    final controller = TextEditingController();
    addTearDown(controller.dispose);
    await tester.pumpApp(
      Scaffold(
        body: PhoneField(
          label: 'Mobile number',
          countryCode: '+971',
          countryCodeLabel: 'Country code, United Arab Emirates, +971',
          controller: controller,
        ),
      ),
    );
    await tester.enterText(find.byType(TextField), '+971 50 123 4567');
    expect(controller.text, '50 123 4567');
    expect(find.text('+971'), findsOneWidget);
  });
}
