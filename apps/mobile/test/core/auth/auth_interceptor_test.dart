import 'dart:ui';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/auth/auth_api.dart';
import 'package:shoot_mobile/core/auth/auth_interceptor.dart';
import 'package:shoot_mobile/core/auth/session.dart';
import 'package:shoot_mobile/core/auth/session_cubit.dart';
import 'package:shoot_mobile/core/auth/session_store.dart';
import 'package:shoot_mobile/core/config/app_config.dart';
import 'package:shoot_mobile/core/error/exceptions.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/l10n/failure_message.dart';
import 'package:shoot_mobile/core/l10n/generated/app_localizations.dart';
import 'package:shoot_mobile/core/network/api_get.dart';
import 'package:shoot_mobile/core/network/dio_client.dart';
import 'package:shoot_mobile/core/time/clock.dart';

import '../../helpers/api_examples.dart';
import '../../helpers/auth_fixtures.dart';
import '../../helpers/scripted_adapter.dart';

const _config = AppConfig(apiBaseUrl: 'http://api.test', environment: 'test');

void main() {
  late MemorySessionStore store;
  late MockAuthApi api;
  late ScriptedAdapter adapter;

  setUp(() {
    store = MemorySessionStore();
    api = MockAuthApi();
  });

  /// The shared Dio as the app builds it, the auth interceptor after the install id.
  (Dio, SessionCubit) build({
    required Session? session,
    Clock? clock,
    ResponseBody Function(RequestOptions)? respond,
    bool log = false,
    DebugPrintCallback? print,
  }) {
    final cubit = SessionCubit(
      store: store,
      api: api,
      clock: clock ?? examplesClock,
      restored: session,
      storeRead: true,
    );
    adapter = ScriptedAdapter(respond);
    final dio = createDio(
      config: _config,
      languageCode: () => 'en',
      installId: () => '0123456789abcdef0123456789abcdef',
      auth: AuthInterceptor(
        session: cubit,
        api: api,
        clock: clock ?? examplesClock,
      ),
      log: false,
    )..httpClientAdapter = adapter;
    if (log) dio.interceptors.add(RequestLogInterceptor(print));
    return (dio, cubit);
  }

  Session sessionExpiringIn(Duration d) =>
      exampleSession(exp: examplesNow.add(d));

  test(
    'adds Authorization: Bearer when signed in, nothing when signed out',
    () async {
      final session = sessionExpiringIn(const Duration(days: 6));
      final (signedIn, _) = build(session: session);
      await apiGet(signedIn, 'site');
      expect(
        adapter.lastRequest!.headers['Authorization'],
        'Bearer ${session.token}',
      );
      expect(
        adapter.lastRequest!.headers['X-Shoot-Install'],
        '0123456789abcdef0123456789abcdef',
      );

      final (signedOut, _) = build(session: null);
      await apiGet(signedOut, 'site');
      expect(
        adapter.lastRequest!.headers.containsKey('Authorization'),
        isFalse,
      );
    },
  );

  group(
    'OT-US3-S2 under 2 days left, the session is refreshed before the request',
    () {
      test('OT-US3-S2 with 1 day 23 h left, three queued requests trigger one refresh, '
          'then all three carry the new token', () async {
        final refreshed = refreshedTokenFromJson(loadExample('auth-refresh'));
        when(() => api.refresh(any())).thenAnswer((_) async {
          await Future<void>.delayed(const Duration(milliseconds: 10));
          return refreshed;
        });
        final (dio, cubit) = build(
          session: sessionExpiringIn(const Duration(days: 1, hours: 23)),
        );

        await Future.wait([
          apiGet(dio, 'site'),
          apiGet(dio, 'navigation'),
          apiGet(dio, 'personas'),
        ]);

        verify(() => api.refresh(any())).called(1);
        expect(adapter.requests, hasLength(3));
        for (final r in adapter.requests) {
          expect(r.headers['Authorization'], 'Bearer ${refreshed.token}');
        }
        expect(cubit.token, refreshed.token);
        expect((await store.read())!.token, refreshed.token);
      });

      test('OT-US3-S2 with 2 days 1 h left there is no refresh', () async {
        final session = sessionExpiringIn(const Duration(days: 2, hours: 1));
        final (dio, _) = build(session: session);
        await apiGet(dio, 'site');
        verifyNever(() => api.refresh(any()));
        expect(
          adapter.lastRequest!.headers['Authorization'],
          'Bearer ${session.token}',
        );
      });

      test('OT-US3-S2 a refresh network error keeps the old token', () async {
        final session = sessionExpiringIn(const Duration(hours: 5));
        when(() => api.refresh(any())).thenThrow(const NetworkException());
        final (dio, cubit) = build(session: session);
        await apiGet(dio, 'site');
        expect(
          adapter.lastRequest!.headers['Authorization'],
          'Bearer ${session.token}',
        );
        expect(cubit.state, SignedIn(session));
      });

      test('OT-US3-S2 a refresh 401 signs out and sends no token', () async {
        when(() => api.refresh(any())).thenThrow(
          const ServerException(
            statusCode: 401,
            code: 'api.errors.tokenInvalid',
          ),
        );
        final (dio, cubit) = build(
          session: sessionExpiringIn(const Duration(hours: 5)),
        );
        await apiGet(dio, 'site');
        expect(cubit.state, const SignedOut());
        expect(
          adapter.lastRequest!.headers.containsKey('Authorization'),
          isFalse,
        );
      });
    },
  );

  group(
    'OT-US3-S4 a 401 clears the session and sends account pages to sign-in',
    () {
      test(
        'OT-US3-S4 a 401 on a request that carried a token calls expire()',
        () async {
          final (dio, cubit) = build(
            session: sessionExpiringIn(const Duration(days: 6)),
            respond: (_) => jsonBody(
              loadExample('problem-404')
                ..['status'] = 401
                ..['code'] = 'api.errors.tokenInvalid',
              status: 401,
            ),
          );
          await expectLater(apiGet(dio, 'me'), throwsA(isA<ServerException>()));
          expect(cubit.state, const SignedOut());
          expect(await store.read(), isNull);
        },
      );

      test('OT-US3-S4 a 401 without a token changes nothing', () async {
        final (dio, cubit) = build(
          session: null,
          respond: (_) =>
              jsonBody({'code': 'api.errors.unauthorized'}, status: 401),
        );
        await expectLater(apiGet(dio, 'me'), throwsA(isA<ServerException>()));
        expect(cubit.state, const SignedOut());
      });
    },
  );

  group('OT-US2-S4 no phone number or code reaches the logs', () {
    test('OT-US2-S4 an auth/* request and its response are never logged; '
        'other calls log their method, path and status only', () async {
      final lines = <String>[];
      void capture(String? message, {int? wrapWidth}) =>
          lines.add(message ?? '');
      final (dio, _) = build(
        session: sessionExpiringIn(const Duration(days: 6)),
        log: true,
        print: capture,
        respond: (o) => jsonBody(
          o.path.contains('auth/otp/request')
              ? loadExample('auth-challenge')
              : <String, Object?>{},
          status: o.path.contains('auth/') ? 202 : 200,
        ),
      );

      await dio.post<Object?>(
        '/api/mobile/v1/auth/otp/request',
        data: loadExample('auth-request'),
      );
      await dio.post<Object?>(
        '/api/mobile/v1/auth/otp/verify',
        data: loadExample('auth-verify-seeker'),
      );
      await dio.get<Object?>('/api/mobile/v1/me');
      await dio.get<Object?>('/api/mobile/v1/site');

      expect(lines, ['GET /api/mobile/v1/site → 200']);
      final all = lines.join('\n');
      expect(all, isNot(contains('971')));
      expect(all, isNot(contains('482713')));
      expect(all, isNot(contains('Bearer')));
    });

    test('OT-US2-S4 the Dio logger is debug-only: off when log is false', () {
      Dio dio({bool? log}) => log == null
          ? createDio(
              config: _config,
              languageCode: () => 'en',
              installId: () => '0123456789abcdef0123456789abcdef',
            )
          : createDio(
              config: _config,
              languageCode: () => 'en',
              installId: () => '0123456789abcdef0123456789abcdef',
              log: log,
            );
      // Tests run in debug mode, where the default (`!kReleaseMode`) adds it.
      expect(kReleaseMode, isFalse);
      expect(
        dio().interceptors.whereType<RequestLogInterceptor>(),
        hasLength(1),
      );
      expect(
        dio(log: false).interceptors.whereType<RequestLogInterceptor>(),
        isEmpty,
      );
    });

    test('OT-US2-S4 failure messages never contain the number', () {
      for (final code in ['en', 'ar']) {
        final l10n = lookupAppLocalizations(Locale(code));
        for (final problem in ProblemCode.values) {
          final text = problem.message(l10n, retryAfter: 42);
          expect(
            text,
            isNot(matches(RegExp(r'9715\d{8}'))),
            reason: problem.wire,
          );
          expect(text, isNot(contains('+971')), reason: problem.wire);
        }
        final failure = const ServerFailure(
          statusCode: 422,
          code: 'api.errors.invalidInput',
          fields: [(path: 'body.phone', code: 'auth.errors.phoneInvalid')],
        ).message(l10n);
        expect(failure, isNot(contains('971')));
      }
    });
  });

  test('AuthApi sends the token for its own calls', () async {
    final adapter = ScriptedAdapter(
      (o) => o.path.endsWith('/me')
          ? jsonBody(loadExample('me-seeker'))
          : o.path.endsWith('/refresh')
          ? jsonBody(loadExample('auth-refresh'))
          : ResponseBody.fromString('', 204),
    );
    final plain = createDio(
      config: _config,
      languageCode: () => 'en',
      installId: () => '0123456789abcdef0123456789abcdef',
      log: false,
    )..httpClientAdapter = adapter;
    final authApi = AuthApi(plain);

    expect((await authApi.me('t1')).name, 'Sara');
    expect(adapter.lastRequest!.headers['Authorization'], 'Bearer t1');
    expect(
      (await authApi.refresh('t2')).exp,
      DateTime.utc(2026, 12, 18, 13, 20),
    );
    expect(adapter.lastRequest!.method, 'POST');
    await authApi.logout('t3');
    expect(adapter.lastRequest!.uri.path, '/api/mobile/v1/auth/logout');
    expect(adapter.lastRequest!.headers['Authorization'], 'Bearer t3');
  });
}
