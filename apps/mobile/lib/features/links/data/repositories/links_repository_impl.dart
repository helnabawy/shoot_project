import 'package:shoot_mobile/core/error/api_result.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/links/data/datasources/links_remote_data_source.dart';
import 'package:shoot_mobile/features/links/domain/entities/resolution.dart';
import 'package:shoot_mobile/features/links/domain/repositories/links_repository.dart';

/// Turns datasource exceptions into failures (see [apiResult]) and the model into a [Resolution].
final class LinksRepositoryImpl implements LinksRepository {
  const LinksRepositoryImpl(this._remote);

  final LinksRemoteDataSource _remote;

  @override
  Future<Result<Resolution>> resolve(String path) =>
      apiResult(() async => (await _remote.resolve(path)).toEntity());
}
