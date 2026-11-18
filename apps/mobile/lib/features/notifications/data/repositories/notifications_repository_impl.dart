import 'package:shoot_mobile/core/error/api_result.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/notifications/data/datasources/notifications_remote_data_source.dart';
import 'package:shoot_mobile/features/notifications/domain/entities/notice.dart';
import 'package:shoot_mobile/features/notifications/domain/repositories/notifications_repository.dart';

/// Turns datasource exceptions into failures (see `apiResult`).
final class NotificationsRepositoryImpl implements NotificationsRepository {
  const NotificationsRepositoryImpl(this._remote);

  final NotificationsRemoteDataSource _remote;

  @override
  Future<Result<Notices>> notices() =>
      apiResult(() async => (await _remote.notices()).toEntity());

  @override
  Future<Result<Notices>> markRead(String id) =>
      apiResult(() async => (await _remote.markRead(id)).toEntity());
}
