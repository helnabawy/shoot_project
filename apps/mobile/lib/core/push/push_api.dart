import 'package:dio/dio.dart';
import 'package:shoot_mobile/core/network/api_get.dart';
import 'package:shoot_mobile/core/network/api_post.dart';
import 'package:shoot_mobile/core/network/api_send.dart';
import 'package:shoot_mobile/core/network/json_read.dart';

/// `/api/mobile/v1/me/push…` (feature 019, contracts/mobile-api.md). Uses the signed-in Dio.
class PushApi {
  const PushApi(this._dio);

  final Dio _dio;

  Future<void> register({
    required String token,
    required String platform,
    required String locale,
  }) => apiPost(
    _dio,
    'me/push/devices',
    body: {'token': token, 'platform': platform, 'locale': locale},
  );

  Future<void> remove(String token) =>
      apiSend(_dio, 'DELETE', 'me/push/devices/${Uri.encodeComponent(token)}');

  Future<bool> enabled() async =>
      readBool(await apiGet(_dio, 'me/push'), 'enabled');

  Future<bool> setEnabled({required bool enabled}) async => readBool(
    await apiSend(_dio, 'PUT', 'me/push', body: {'enabled': enabled}),
    'enabled',
  );
}
