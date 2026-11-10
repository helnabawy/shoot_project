import 'package:dio/dio.dart';
import 'package:get_it/get_it.dart';
import 'package:shoot_mobile/features/service_health/data/datasources/service_health_remote_data_source.dart';
import 'package:shoot_mobile/features/service_health/data/repositories/service_health_repository_impl.dart';
import 'package:shoot_mobile/features/service_health/domain/repositories/service_health_repository.dart';
import 'package:shoot_mobile/features/service_health/domain/usecases/check_service_health.dart';
import 'package:shoot_mobile/features/service_health/presentation/cubit/service_health_cubit.dart';

/// Wires the feature, outermost dependency first. Datasource, repository and
/// use case are stateless singletons; a cubit is created per screen.
void registerServiceHealthFeature(GetIt getIt) {
  getIt
    ..registerLazySingleton<ServiceHealthRemoteDataSource>(
      () => ServiceHealthRemoteDataSourceImpl(getIt<Dio>()),
    )
    ..registerLazySingleton<ServiceHealthRepository>(
      () => ServiceHealthRepositoryImpl(getIt<ServiceHealthRemoteDataSource>()),
    )
    ..registerLazySingleton<CheckServiceHealth>(
      () => CheckServiceHealth(getIt<ServiceHealthRepository>()),
    )
    ..registerFactory<ServiceHealthCubit>(
      () => ServiceHealthCubit(getIt<CheckServiceHealth>()),
    );
}
