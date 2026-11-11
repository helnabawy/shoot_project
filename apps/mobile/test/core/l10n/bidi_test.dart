import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/l10n/bidi.dart';

void main() {
  test('the first strong character decides the direction', () {
    expect(firstStrongDirection('Omar K.'), TextDirection.ltr);
    expect(firstStrongDirection('4 hours, Dubai'), TextDirection.ltr);
    expect(firstStrongDirection('عمر ك.'), TextDirection.rtl);
    expect(firstStrongDirection('950'), isNull);
  });

  testWidgets('Latin text in Arabic is isolated; matching text is left alone', (
    tester,
  ) async {
    late String inRtl;
    late String inLtr;
    late String arabicInRtl;
    await tester.pumpWidget(
      Directionality(
        textDirection: TextDirection.rtl,
        child: Builder(
          builder: (context) {
            inRtl = isolate(context, 'Omar K.');
            arabicInRtl = isolate(context, 'عمر ك.');
            return const SizedBox();
          },
        ),
      ),
    );
    await tester.pumpWidget(
      Directionality(
        textDirection: TextDirection.ltr,
        child: Builder(
          builder: (context) {
            inLtr = isolate(context, 'Omar K.');
            return const SizedBox();
          },
        ),
      ),
    );
    expect(inRtl, '\u2068Omar K.\u2069');
    expect(arabicInRtl, 'عمر ك.');
    expect(inLtr, 'Omar K.');
  });
}
