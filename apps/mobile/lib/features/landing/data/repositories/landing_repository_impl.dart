import 'package:shoot_mobile/core/error/api_result.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/landing/data/datasources/landing_remote_data_source.dart';
import 'package:shoot_mobile/features/landing/domain/entities/landing.dart';
import 'package:shoot_mobile/features/landing/domain/repositories/landing_repository.dart';

/// Turns datasource exceptions into failures (see [apiResult]) and the model
/// into the entity.
final class LandingRepositoryImpl implements LandingRepository {
  const LandingRepositoryImpl(this._remote);

  final LandingRemoteDataSource _remote;

  @override
  Future<Result<Landing>> getLanding() =>
      apiResult(() async => (await _remote.fetchLanding()).toEntity());
}
