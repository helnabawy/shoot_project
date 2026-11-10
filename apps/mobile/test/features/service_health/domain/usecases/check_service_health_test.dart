import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/usecase/use_case.dart';
import 'package:shoot_mobile/features/service_health/domain/entities/service_health.dart';
import 'package:shoot_mobile/features/service_health/domain/repositories/service_health_repository.dart';
import 'package:shoot_mobile/features/service_health/domain/usecases/check_service_health.dart';

class _MockRepository extends Mock implements ServiceHealthRepository {}

void main() {
  late _MockRepository repository;
  late CheckServiceHealth useCase;

  setUp(() {
    repository = _MockRepository();
    useCase = CheckServiceHealth(repository);
  });

  test('returns the health the repository reports', () async {
    const health = ServiceHealth(status: HealthStatus.healthy);
    when(() => repository.checkHealth())
        .thenAnswer((_) async => const Ok(health));

    final result = await useCase(const NoParams());

    expect(result, const Ok(health));
    verify(() => repository.checkHealth()).called(1);
    verifyNoMoreInteractions(repository);
  });

  test('passes a repository failure through unchanged', () async {
    when(() => repository.checkHealth())
        .thenAnswer((_) async => const Err(NetworkFailure()));

    final result = await useCase(const NoParams());

    expect(result, const Err<ServiceHealth>(NetworkFailure()));
  });
}
