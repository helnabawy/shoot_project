import 'package:dio/dio.dart';
import 'package:get_it/get_it.dart';
import 'package:shoot_mobile/features/creators/data/datasources/creators_remote_data_source.dart';
import 'package:shoot_mobile/features/creators/data/repositories/creators_repository_impl.dart';
import 'package:shoot_mobile/features/creators/domain/repositories/creators_repository.dart';

/// Wires creators: datasource and repository, stateless singletons. Use cases
/// and cubits arrive with the creator screens (011).
void registerCreatorsFeature(GetIt getIt) {
  getIt
    ..registerLazySingleton<CreatorsRemoteDataSource>(
      () => CreatorsRemoteDataSourceImpl(getIt<Dio>()),
    )
    ..registerLazySingleton<CreatorsRepository>(
      () => CreatorsRepositoryImpl(getIt<CreatorsRemoteDataSource>()),
    );
}
