import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/auth/safe_next.dart';

void main() {
  group('OT-US3-S7 an external or unknown next target is ignored', () {
    for (final target in [
      'https://evil.example',
      '//evil.example',
      r'/\evil',
      'javascript:alert(1)',
      '/unknown/path',
      'account',
      '',
      null,
    ]) {
      test('OT-US3-S7 "$target" is ignored', () {
        expect(safeNext(target), isNull);
      });
    }

    for (final target in [
      '/account/bookings',
      '/ar/account',
      '/account/bookings/B-1',
      '/creators/SH-0087?tab=work',
      '/',
    ]) {
      test('OT-US3-S7 "$target" is kept', () {
        expect(safeNext(target), target);
      });
    }
  });
}
