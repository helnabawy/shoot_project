import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/network/stamp_poller.dart';

/// `testWidgets` runs on a fake clock, so the 3 s ticks pass without waiting.
void main() {
  group('OF-US4-S2 the stamp poller keeps a list live', () {
    testWidgets('calls onChanged only when the stamp moves', (tester) async {
      final stamps = ['a', 'a', 'b', 'b', null, 'c'];
      var reads = 0;
      var changes = 0;
      final poller = StampPoller(
        read: () async {
          final at = reads < stamps.length ? reads : stamps.length - 1;
          reads++;
          return stamps[at];
        },
        onChanged: () => changes++,
      )..start(known: 'a');
      for (var i = 0; i < 6; i++) {
        await tester.pump(const Duration(seconds: 3));
      }
      expect(reads, 6);
      expect(changes, 2);
      poller.stop();
      expect(poller.running, isFalse);
    });

    testWidgets(
      'the first read sets the stamp without a reload; a failed read is skipped',
      (tester) async {
        var changes = 0;
        var fail = true;
        final poller = StampPoller(
          read: () async {
            if (fail) {
              fail = false;
              throw StateError('offline');
            }
            return 'x';
          },
          onChanged: () => changes++,
        )..start();
        for (var i = 0; i < 3; i++) {
          await tester.pump(const Duration(seconds: 3));
        }
        expect(changes, 0);
        expect(poller.running, isTrue);
        poller.stop();
      },
    );

    testWidgets('stops ticking once stopped', (tester) async {
      var reads = 0;
      StampPoller(read: () async => '${reads++}', onChanged: () {})
        ..start()
        ..stop();
      await tester.pump(const Duration(seconds: 10));
      expect(reads, 0);
    });
  });
}
