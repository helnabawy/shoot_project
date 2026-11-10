import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/error/exceptions.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/service_health/data/datasources/service_health_remote_data_source.dart';
import 'package:shoot_mobile/features/service_health/data/models/service_health_model.dart';
import 'package:shoot_mobile/features/service_health/data/repositories/service_health_repository_impl.dart';
import 'package:shoot_mobile/features/service_health/domain/entities/service_health.dart';

class _MockRemote extends Mock implements ServiceHealthRemoteDataSource {}

void main() {
  late _MockRemote remote;
  late ServiceHealthRepositoryImpl repository;

  setUp(() {
    remote = _MockRemote();
    repository = ServiceHealthRepositoryImpl(remote);
  });

  test('maps a healthy body to a healthy entity', () async {
    when(
      () => remote.fetchHealth(),
    ).thenAnswer((_) async => const ServiceHealthModel(status: 'ok', db: 'ok'));

    expect(
      await repository.checkHealth(),
      const Ok(ServiceHealth(status: HealthStatus.healthy)),
    );
  });

  test('maps an unreachable database to a degraded entity', () async {
    when(() => remote.fetchHealth()).thenAnswer(
      (_) async => const ServiceHealthModel(status: 'error', db: 'unreachable'),
    );

    expect(
      await repository.checkHealth(),
      const Ok(ServiceHealth(status: HealthStatus.degraded)),
    );
  });

  test('turns a NetworkException into a NetworkFailure', () async {
    when(() => remote.fetchHealth()).thenThrow(const NetworkException());

    expect(
      await repository.checkHealth(),
      const Err<ServiceHealth>(NetworkFailure()),
    );
  });

  test(
    'turns a ServerException into a ServerFailure with its status',
    () async {
      when(() => remote.fetchHealth())
          .thenThrow(const ServerException(statusCode: 500));

      expect(
        await repository.checkHealth(),
        const Err<ServiceHealth>(ServerFailure(statusCode: 500)),
      );
    },
  );

  test('turns any other exception into an UnexpectedFailure', () async {
    when(() => remote.fetchHealth()).thenThrow(Exception('boom'));

    expect(
      await repository.checkHealth(),
      const Err<ServiceHealth>(UnexpectedFailure()),
    );
  });
}
