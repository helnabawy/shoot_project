import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/push/push_cubit.dart';

import 'fakes.dart';

void main() {
  late MockPushApi api;

  setUp(() {
    api = MockPushApi();
    when(
      () => api.register(
        token: any(named: 'token'),
        platform: any(named: 'platform'),
        locale: any(named: 'locale'),
      ),
    ).thenAnswer((_) async {});
    when(() => api.remove(any())).thenAnswer((_) async {});
  });

  group('BI-US6-S1 asking once, with a reason', () {
    test(
      'a signed-in member is asked once; declining changes nothing else',
      () async {
        final store = MemoryAskStore();
        final push = service(
          messaging: FakeMessaging(),
          api: api,
          store: store,
        );
        await push.start(open: (_) {});
        expect(push.shouldAsk, isTrue);
        await push.decline();
        expect(push.shouldAsk, isFalse);
        verifyNever(
          () => api.register(
            token: any(named: 'token'),
            platform: any(named: 'platform'),
            locale: any(named: 'locale'),
          ),
        );
      },
    );

    test(
      'nobody is asked when push is unavailable or the member is signed out',
      () async {
        final off = service(
          messaging: FakeMessaging(available: false),
          api: api,
        );
        await off.start(open: (_) {});
        expect(off.shouldAsk, isFalse);
        final out = service(
          messaging: FakeMessaging(),
          api: api,
          signedIn: false,
        );
        await out.start(open: (_) {});
        expect(out.shouldAsk, isFalse);
      },
    );
  });

  group('BI-US6-S2 registering and removing the device', () {
    test('allowing registers this device in the app language; a token change registers again', () async {
      final messaging = FakeMessaging();
      final push = service(messaging: messaging, api: api, language: 'ar');
      await push.start(open: (_) {});
      expect(await push.allow(), isTrue);
      verify(
        () => api.register(
          token: 'device-token-1',
          platform: 'ios',
          locale: 'ar',
        ),
      ).called(1);
      messaging.currentToken = 'device-token-2';
      messaging.refreshes.add('device-token-2');
      await pumpEventQueue();
      verify(
        () => api.register(
          token: 'device-token-2',
          platform: 'ios',
          locale: 'ar',
        ),
      ).called(1);
    });

    test('the system prompt refused: nothing is registered', () async {
      final push = service(messaging: FakeMessaging(allowed: false), api: api);
      await push.start(open: (_) {});
      expect(await push.allow(), isFalse);
      verifyNever(
        () => api.register(
          token: any(named: 'token'),
          platform: any(named: 'platform'),
          locale: any(named: 'locale'),
        ),
      );
    });

    test('sign-out removes the device; a failure does not stop it', () async {
      final push = service(
        messaging: FakeMessaging(),
        api: api,
        store: MemoryAskStore(asked: true),
      );
      await push.start(open: (_) {});
      await push.unregister();
      verify(() => api.remove('device-token-1')).called(1);
      when(() => api.remove(any())).thenThrow(Exception('offline'));
      await push.unregister();
    });
  });

  group('BI-US6-S3 the switch', () {
    blocTest<PushCubit, PushSwitchState>(
      'reads the preference, then switches it off',
      setUp: () {
        when(() => api.enabled()).thenAnswer((_) async => true);
        when(() => api.setEnabled(enabled: false))
            .thenAnswer((_) async => false);
      },
      build: () => PushCubit(api),
      act: (c) async {
        await c.load();
        await c.set(enabled: false);
      },
      expect: () => const [
        PushSwitchState(enabled: true),
        PushSwitchState(enabled: false, busy: true),
        PushSwitchState(enabled: false),
      ],
    );

    blocTest<PushCubit, PushSwitchState>(
      'a failed save puts the switch back',
      setUp: () =>
          when(() => api.setEnabled(enabled: false))
              .thenThrow(Exception('offline')),
      build: () => PushCubit(api),
      seed: () => const PushSwitchState(enabled: true),
      act: (c) => c.set(enabled: false),
      expect: () => const [
        PushSwitchState(enabled: false, busy: true),
        PushSwitchState(enabled: true),
      ],
    );
  });
}
