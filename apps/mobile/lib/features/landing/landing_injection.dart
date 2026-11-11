import 'package:dio/dio.dart';
import 'package:get_it/get_it.dart';
import 'package:shoot_mobile/features/landing/data/datasources/landing_remote_data_source.dart';
import 'package:shoot_mobile/features/landing/data/repositories/landing_repository_impl.dart';
import 'package:shoot_mobile/features/landing/domain/repositories/landing_repository.dart';

/// Wires the landing: datasource and repository, stateless singletons. Use
/// cases and cubits arrive with the landing screen (010).
void registerLandingFeature(GetIt getIt) {
  getIt
    ..registerLazySingleton<LandingRemoteDataSource>(
      () => LandingRemoteDataSourceImpl(getIt<Dio>()),
    )
    ..registerLazySingleton<LandingRepository>(
      () => LandingRepositoryImpl(getIt<LandingRemoteDataSource>()),
    );
}
