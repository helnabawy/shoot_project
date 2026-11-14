import 'package:flutter_test/flutter_test.dart';

import 'fakes.dart';

void main() {
  group('BI-US4-S2 a tapped notification opens its page', () {
    test(
      'the client opens step 2 of their brief; a creator opens the inbox',
      () async {
        final messaging = FakeMessaging();
        final opened = <String>[];
        final push = service(
          messaging: messaging,
          api: MockPushApi(),
          store: MemoryAskStore(asked: true),
        );
        await push.start(open: opened.add);
        messaging.taps
          ..add({'event': 'brief-accepted', 'path': '/match/B-7K2QX/key123'})
          ..add({'event': 'brief-new', 'path': '/account/inbox'});
        await pumpEventQueue();
        expect(opened, ['/match/B-7K2QX/key123', '/account/inbox']);
      },
    );

    test('the notification that launched the app is opened once', () async {
      final opened = <String>[];
      await service(
        messaging: FakeMessaging(initial: {'path': '/account/inbox'}),
        api: MockPushApi(),
      ).start(open: opened.add);
      expect(opened, ['/account/inbox']);
    });

    test(
      'a path the app does not know, or an outside address, is ignored',
      () async {
        final messaging = FakeMessaging();
        final opened = <String>[];
        await service(
          messaging: messaging,
          api: MockPushApi(),
        ).start(open: opened.add);
        messaging.taps
          ..add({'path': 'https://evil.example/phish'})
          ..add({'path': '/nowhere/at/all'})
          ..add({'event': 'brief-new'});
        await pumpEventQueue();
        expect(opened, isEmpty);
      },
    );
  });
}
