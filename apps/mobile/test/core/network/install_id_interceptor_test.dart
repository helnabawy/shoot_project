import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/config/app_config.dart';
import 'package:shoot_mobile/core/install/install_id_store.dart';
import 'package:shoot_mobile/core/network/dio_client.dart';
import 'package:shoot_mobile/core/network/install_id_interceptor.dart';
import 'package:shoot_mobile/core/preferences/preferences_store.dart';

import '../../helpers/in_memory_preferences_store.dart';
import '../../helpers/scripted_adapter.dart';

const _storedId = '0123456789abcdef0123456789abcdef';

void main() {
  group('MR-US2-S8 X-Shoot-Install', () {
    test(
      'every request carries the stored id next to Accept-Language',
      () async {
        final store = InstallIdStore(
          InMemoryPreferencesStore({PreferenceKeys.installId: _storedId}),
        );
        final adapter = ScriptedAdapter();
        final dio = createDio(
          config: const AppConfig(
            apiBaseUrl: 'http://api.test',
            environment: 'test',
          ),
          languageCode: () => 'ar',
          installId: store.id,
        )..httpClientAdapter = adapter;

        await dio.get<dynamic>('/api/mobile/v1/site');
        await dio.get<dynamic>('/api/mobile/v1/navigation');

        expect(adapter.requests, hasLength(2));
        for (final request in adapter.requests) {
          expect(request.headers[InstallIdInterceptor.header], _storedId);
          expect(request.headers['Accept-Language'], 'ar');
        }
      },
    );

    test('runs after the language interceptor', () {
      final dio = createDio(
        config: const AppConfig(
          apiBaseUrl: 'http://api.test',
          environment: 'test',
        ),
        languageCode: () => 'en',
        installId: () => _storedId,
      );
      final kinds = dio.interceptors.map((i) => i.runtimeType).toList();

      expect(
        kinds.indexOf(InstallIdInterceptor),
        greaterThan(kinds.indexOf(LanguageInterceptor)),
      );
    });

    test('the header name is the one the server reads', () {
      expect(InstallIdInterceptor.header, 'X-Shoot-Install');
    });

    test('reads the id per request', () async {
      var id = _storedId;
      final adapter = ScriptedAdapter();
      final dio = Dio()
        ..httpClientAdapter = adapter
        ..interceptors.add(InstallIdInterceptor(() => id));

      await dio.get<dynamic>('http://api.test/a');
      id = 'ffffffffffffffffffffffffffffffff';
      await dio.get<dynamic>('http://api.test/b');

      expect(adapter.requests.first.headers['X-Shoot-Install'], _storedId);
      expect(adapter.requests.last.headers['X-Shoot-Install'], id);
    });
  });
}
