import 'package:shoot_mobile/core/error/exceptions.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/service_health/data/datasources/service_health_remote_data_source.dart';
import 'package:shoot_mobile/features/service_health/domain/entities/service_health.dart';
import 'package:shoot_mobile/features/service_health/domain/repositories/service_health_repository.dart';

/// Turns datasource exceptions into [Failure]s and models into entities.
final class ServiceHealthRepositoryImpl implements ServiceHealthRepository {
  const ServiceHealthRepositoryImpl(this._remote);

  final ServiceHealthRemoteDataSource _remote;

  @override
  Future<Result<ServiceHealth>> checkHealth() async {
    try {
      final model = await _remote.fetchHealth();
      return Ok(model.toEntity());
    } on NetworkException {
      return const Err(NetworkFailure());
    } on ServerException catch (e) {
      return Err(ServerFailure(statusCode: e.statusCode));
    } on Exception {
      return const Err(UnexpectedFailure());
    }
  }
}
