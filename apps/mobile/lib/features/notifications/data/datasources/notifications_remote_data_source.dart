import 'package:dio/dio.dart';
import 'package:shoot_mobile/core/network/api_get.dart';
import 'package:shoot_mobile/core/network/api_post.dart';
import 'package:shoot_mobile/features/notifications/data/models/notices_model.dart';

/// `/api/mobile/v1/me/notifications`. Throws through the api helpers; never a Dio type.
abstract interface class NotificationsRemoteDataSource {
  Future<NoticesModel> notices();

  Future<NoticesModel> markRead(String id);
}

final class NotificationsRemoteDataSourceImpl
    implements NotificationsRemoteDataSource {
  const NotificationsRemoteDataSourceImpl(this._dio);

  final Dio _dio;

  static const _base = 'me/notifications';

  @override
  Future<NoticesModel> notices() async =>
      NoticesModel.fromJson(await apiGet(_dio, _base));

  @override
  Future<NoticesModel> markRead(String id) async => NoticesModel.fromJson(
    (await apiPost(_dio, '$_base/${Uri.encodeComponent(id)}/read')).body ??
        const {},
  );
}
