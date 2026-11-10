import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/service_health/domain/entities/service_health.dart';
import 'package:shoot_mobile/features/service_health/domain/repositories/service_health_repository.dart';
import 'package:shoot_mobile/features/service_health/domain/usecases/check_service_health.dart';
import 'package:shoot_mobile/features/service_health/presentation/cubit/service_health_cubit.dart';

class _MockRepository extends Mock implements ServiceHealthRepository {}

void main() {
  late _MockRepository repository;

  ServiceHealthCubit build() =>
      ServiceHealthCubit(CheckServiceHealth(repository));

  setUp(() => repository = _MockRepository());

  test('starts in the initial state', () {
    expect(build().state, const ServiceHealthInitial());
  });

  blocTest<ServiceHealthCubit, ServiceHealthState>(
    'emits loading then loaded on success',
    setUp: () => when(() => repository.checkHealth()).thenAnswer(
      (_) async => const Ok(ServiceHealth(status: HealthStatus.healthy)),
    ),
    build: build,
    act: (cubit) => cubit.check(),
    expect: () => const [
      ServiceHealthLoading(),
      ServiceHealthLoaded(ServiceHealth(status: HealthStatus.healthy)),
    ],
  );

  blocTest<ServiceHealthCubit, ServiceHealthState>(
    'emits loading then failed on failure',
    setUp: () =>
        when(() => repository.checkHealth())
            .thenAnswer((_) async => const Err(NetworkFailure())),
    build: build,
    act: (cubit) => cubit.check(),
    expect: () => const [
      ServiceHealthLoading(),
      ServiceHealthFailed(NetworkFailure()),
    ],
  );
}
