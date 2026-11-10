import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/features/service_health/data/models/service_health_model.dart';
import 'package:shoot_mobile/features/service_health/domain/entities/service_health.dart';

void main() {
  test('reads the web health body', () {
    final model = ServiceHealthModel.fromJson(const {
      'status': 'ok',
      'db': 'ok',
    });

    expect(model, const ServiceHealthModel(status: 'ok', db: 'ok'));
    expect(model.toEntity().status, HealthStatus.healthy);
  });

  test('anything but ok/ok is degraded', () {
    const model = ServiceHealthModel(status: 'error', db: 'unreachable');

    expect(model.toEntity().status, HealthStatus.degraded);
  });

  test('rejects a body with missing or non-string fields', () {
    expect(
      () => ServiceHealthModel.fromJson(const {'status': 'ok'}),
      throwsFormatException,
    );
    expect(
      () => ServiceHealthModel.fromJson(const {'status': 1, 'db': 'ok'}),
      throwsFormatException,
    );
  });
}
