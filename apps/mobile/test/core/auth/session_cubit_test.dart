import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/auth/session.dart';
import 'package:shoot_mobile/core/auth/session_cubit.dart';
import 'package:shoot_mobile/core/auth/session_store.dart';
import 'package:shoot_mobile/core/error/exceptions.dart';

import '../../helpers/api_examples.dart';
import '../../helpers/auth_fixtures.dart';

void main() {
  late MockAuthApi api;
  late MemorySessionStore store;
  final session = exampleSession(exp: DateTime.utc(2026, 12, 21));
  final freshUser = SessionUser.fromMe(loadExample('me-provider'));

  setUp(() {
    api = MockAuthApi();
    store = MemorySessionStore();
  });

  SessionCubit cubit({Session? restored, bool storeRead = false}) =>
      SessionCubit(
        store: store,
        api: api,
        clock: examplesClock,
        restored: restored,
        storeRead: storeRead,
      );

  group('base cases', () {
    test('starts unknown, or from what main() read', () {
      expect(cubit().state, const SessionUnknown());
      expect(cubit(storeRead: true).state, const SignedOut());
      expect(cubit(restored: session).state, SignedIn(session));
      expect(
        cubit(restored: exampleSession(exp: DateTime.utc(2026, 12, 1))).state,
        const SignedOut(),
      );
    });

    blocTest<SessionCubit, SessionState>(
      'signIn stores the session and emits SignedIn',
      build: cubit,
      act: (c) => c.signIn(session),
      expect: () => [SignedIn(session)],
      verify: (c) async {
        expect(await store.read(), session);
        expect(c.token, session.token);
      },
    );

    blocTest<SessionCubit, SessionState>(
      'expire deletes the session and emits SignedOut',
      setUp: () => store.write(session),
      build: () => cubit(restored: session),
      act: (c) => c.expire(),
      expect: () => [const SignedOut()],
      verify: (c) async {
        expect(await store.read(), isNull);
        expect(c.token, isNull);
      },
    );

    blocTest<SessionCubit, SessionState>(
      'updateToken keeps the user and saves the new token',
      build: () => cubit(restored: session),
      act: (c) =>
          c.updateToken((token: 'refreshed', exp: DateTime.utc(2026, 12, 28))),
      expect: () => [
        SignedIn(
          session.copyWith(token: 'refreshed', exp: DateTime.utc(2026, 12, 28)),
        ),
      ],
    );
  });

  group(
    'OT-US3-S1 a stored session survives a restart with no signed-out flash',
    () {
      blocTest<SessionCubit, SessionState>(
        'OT-US3-S1 a stored, unexpired session is the first state after SessionUnknown, '
        'before any network call; /me then updates the user',
        setUp: () async {
          await store.write(session);
          when(() => api.me(session.token)).thenAnswer((_) async {
            // The stored session was already emitted before this call.
            return freshUser;
          });
        },
        build: cubit,
        act: (c) => c.restore(),
        expect: () => [
          SignedIn(session),
          SignedIn(session.copyWith(user: freshUser)),
        ],
        verify: (_) async {
          verify(() => api.me(session.token)).called(1);
          expect((await store.read())!.user, freshUser);
        },
      );

      blocTest<SessionCubit, SessionState>(
        'OT-US3-S1 a 401 from /me emits SignedOut',
        setUp: () async {
          await store.write(session);
          when(() => api.me(any())).thenThrow(
            const ServerException(
              statusCode: 401,
              code: 'api.errors.tokenInvalid',
            ),
          );
        },
        build: cubit,
        act: (c) => c.restore(),
        expect: () => [SignedIn(session), const SignedOut()],
        verify: (_) async => expect(await store.read(), isNull),
      );

      blocTest<SessionCubit, SessionState>(
        'OT-US3-S1 offline, /me keeps the stored user',
        setUp: () async {
          await store.write(session);
          when(() => api.me(any())).thenThrow(const NetworkException());
        },
        build: cubit,
        act: (c) => c.restore(),
        expect: () => [SignedIn(session)],
      );

      blocTest<SessionCubit, SessionState>(
        'OT-US3-S1 with nothing stored it is SignedOut, with no network call',
        build: cubit,
        act: (c) => c.restore(),
        expect: () => [const SignedOut()],
        verify: (_) => verifyNever(() => api.me(any())),
      );

      blocTest<SessionCubit, SessionState>(
        'OT-US3-S1 an expired stored session is SignedOut and is deleted',
        setUp: () =>
            store.write(exampleSession(exp: DateTime.utc(2026, 12, 14, 6))),
        build: cubit,
        act: (c) => c.restore(),
        expect: () => [const SignedOut()],
        verify: (_) async => expect(await store.read(), isNull),
      );

      blocTest<SessionCubit, SessionState>(
        'OT-US3-S1 restored by main(), restore() only refreshes the user',
        setUp: () =>
            when(() => api.me(any())).thenAnswer((_) async => freshUser),
        build: () => cubit(restored: session, storeRead: true),
        act: (c) => c.restore(),
        expect: () => [SignedIn(session.copyWith(user: freshUser))],
      );
    },
  );

  group(
    'OT-US3-S3 sign-out ends the server session; the old token gets 401',
    () {
      blocTest<SessionCubit, SessionState>(
        'OT-US3-S3 signOut calls logout, clears the store and emits SignedOut',
        setUp: () async {
          await store.write(session);
          when(() => api.logout(session.token)).thenAnswer((_) async {});
        },
        build: () => cubit(restored: session),
        act: (c) => c.signOut(),
        expect: () => [const SignedOut()],
        verify: (_) async {
          verify(() => api.logout(session.token)).called(1);
          expect(await store.read(), isNull);
        },
      );

      blocTest<SessionCubit, SessionState>(
        'OT-US3-S3 a 401 from logout still signs out',
        setUp: () => when(() => api.logout(any())).thenThrow(
          const ServerException(
            statusCode: 401,
            code: 'api.errors.tokenInvalid',
          ),
        ),
        build: () => cubit(restored: session),
        act: (c) => c.signOut(),
        expect: () => [const SignedOut()],
      );

      blocTest<SessionCubit, SessionState>(
        'OT-US3-S3 offline, signOut still signs out',
        setUp: () =>
            when(() => api.logout(any())).thenThrow(const NetworkException()),
        build: () => cubit(restored: session),
        act: (c) => c.signOut(),
        expect: () => [const SignedOut()],
      );
    },
  );
}
