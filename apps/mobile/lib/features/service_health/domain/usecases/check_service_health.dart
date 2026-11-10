import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/usecase/use_case.dart';
import 'package:shoot_mobile/features/service_health/domain/entities/service_health.dart';
import 'package:shoot_mobile/features/service_health/domain/repositories/service_health_repository.dart';

/// Asks whether the Shoot web API (and its database) is answering.
final class CheckServiceHealth implements UseCase<ServiceHealth, NoParams> {
  const CheckServiceHealth(this._repository);

  final ServiceHealthRepository _repository;

  @override
  Future<Result<ServiceHealth>> call(NoParams params) {
    return _repository.checkHealth();
  }
}
