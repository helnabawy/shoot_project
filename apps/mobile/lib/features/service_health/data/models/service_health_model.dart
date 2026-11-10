import 'package:equatable/equatable.dart';
import 'package:shoot_mobile/features/service_health/domain/entities/service_health.dart';

/// The wire shape of `GET /api/health` on the web app
/// (`apps/web/src/app/(payload)/api/health/route.ts`):
/// `{"status":"ok","db":"ok"}` or, with HTTP 503,
/// `{"status":"error","db":"unreachable"}`.
final class ServiceHealthModel extends Equatable {
  const ServiceHealthModel({required this.status, required this.db});

  /// Throws [FormatException] when a field is missing or not a string.
  factory ServiceHealthModel.fromJson(Map<String, dynamic> json) {
    final status = json['status'];
    final db = json['db'];
    if (status is! String || db is! String) {
      throw const FormatException('health: "status" and "db" must be strings');
    }
    return ServiceHealthModel(status: status, db: db);
  }

  final String status;
  final String db;

  ServiceHealth toEntity() {
    final healthy = status == 'ok' && db == 'ok';
    return ServiceHealth(
      status: healthy ? HealthStatus.healthy : HealthStatus.degraded,
    );
  }

  @override
  List<Object?> get props => [status, db];
}
