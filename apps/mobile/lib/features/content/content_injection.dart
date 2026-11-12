import 'package:dio/dio.dart';
import 'package:get_it/get_it.dart';
import 'package:shoot_mobile/features/content/data/datasources/content_remote_data_source.dart';
import 'package:shoot_mobile/features/content/data/repositories/content_repository_impl.dart';
import 'package:shoot_mobile/features/content/domain/repositories/content_repository.dart';

/// Wires guides, editor pages and legal documents: datasource and
/// repository, stateless singletons. Use cases and cubits arrive with the
/// content screens (015).
void registerContentFeature(GetIt getIt) {
  getIt
    ..registerLazySingleton<ContentRemoteDataSource>(
      () => ContentRemoteDataSourceImpl(getIt<Dio>()),
    )
    ..registerLazySingleton<ContentRepository>(
      () => ContentRepositoryImpl(getIt<ContentRemoteDataSource>()),
    );
}
