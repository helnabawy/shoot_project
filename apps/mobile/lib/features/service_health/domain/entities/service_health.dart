import 'package:equatable/equatable.dart';

enum HealthStatus {
  /// The API and its database both answered.
  healthy,

  /// The API answered but its database did not.
  degraded,
}

/// The state of the Shoot web API, as the app understands it. Pure Dart: no
/// Flutter, no JSON, no Dio.
final class ServiceHealth extends Equatable {
  const ServiceHealth({required this.status});

  final HealthStatus status;

  bool get isHealthy => status == HealthStatus.healthy;

  @override
  List<Object?> get props => [status];
}
