import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/service_health/domain/entities/service_health.dart';

/// The contract the domain needs. The data layer implements it; the domain
/// never knows whether the answer came from HTTP, a cache or a fake.
abstract interface class ServiceHealthRepository {
  Future<Result<ServiceHealth>> checkHealth();
}
