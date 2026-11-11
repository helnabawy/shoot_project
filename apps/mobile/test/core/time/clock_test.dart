import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/time/clock.dart';

void main() {
  test('a fixed clock always answers its instant', () {
    final t = DateTime.utc(2026, 12, 14, 6);
    final clock = FixedClock(t);
    expect(clock.now(), t);
    expect(clock.now(), t);
  });

  test('the system clock follows the device', () {
    final before = DateTime.now();
    final now = const SystemClock().now();
    expect(now.isBefore(before), isFalse);
  });
}
