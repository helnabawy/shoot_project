import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/features/creators/domain/whatsapp_link.dart';

void main() {
  test('MC-US1-S5 the link has the digits only and the encoded message', () {
    final link = whatsappLink('+971501234567', 'Hi! About Omar K. (SH-0087)');
    expect(link.toString(), startsWith('https://wa.me/971501234567?text='));
    expect(link!.queryParameters['text'], 'Hi! About Omar K. (SH-0087)');
  });

  test('without a message there is no query', () {
    expect(
      whatsappLink('+971501234567').toString(),
      'https://wa.me/971501234567',
    );
  });

  test('a number that is not E.164 gives no link', () {
    expect(whatsappLink('0501234567'), isNull);
    expect(whatsappLink(''), isNull);
  });
}
