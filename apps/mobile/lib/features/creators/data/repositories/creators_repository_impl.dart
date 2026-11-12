import 'package:shoot_mobile/core/error/api_result.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/creators/data/datasources/creators_remote_data_source.dart';
import 'package:shoot_mobile/features/creators/domain/entities/creators.dart';
import 'package:shoot_mobile/features/creators/domain/repositories/creators_repository.dart';

/// Turns datasource exceptions into failures (see [apiResult]; a 404 is a
/// `NotFoundFailure`) and models into entities.
final class CreatorsRepositoryImpl implements CreatorsRepository {
  const CreatorsRepositoryImpl(this._remote);

  final CreatorsRemoteDataSource _remote;

  @override
  Future<Result<CreatorList>> getCreators([
    CreatorQuery query = const CreatorQuery(),
  ]) => apiResult(() async => (await _remote.fetchCreators(query)).toEntity());

  @override
  Future<Result<CreatorProfile>> getProfile(String code) =>
      apiResult(() async => (await _remote.fetchProfile(code)).toEntity());

  @override
  Future<Result<SpecialtyPage>> getSpecialty(String slug) =>
      apiResult(() async => (await _remote.fetchSpecialty(slug)).toEntity());

  @override
  Future<Result<HirePage>> getHirePage(String slug) =>
      apiResult(() async => (await _remote.fetchHirePage(slug)).toEntity());
}
