import 'package:shoot_mobile/core/error/api_result.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/content/data/datasources/path_status_remote_data_source.dart';
import 'package:shoot_mobile/features/content/domain/entities/path_status.dart';
import 'package:shoot_mobile/features/content/domain/repositories/path_status_repository.dart';

final class PathStatusRepositoryImpl implements PathStatusRepository {
  const PathStatusRepositoryImpl(this._remote);

  final PathStatusRemoteDataSource _remote;

  @override
  Future<Result<PathStatus>> getStatus(String path) => apiResult(
    () async => PathStatus.fromWire(await _remote.fetchStatus(path)),
  );
}
