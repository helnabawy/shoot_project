import 'package:dio/dio.dart';
import 'package:get_it/get_it.dart';
import 'package:shoot_mobile/features/site/data/datasources/site_remote_data_source.dart';
import 'package:shoot_mobile/features/site/data/repositories/site_repository_impl.dart';
import 'package:shoot_mobile/features/site/domain/repositories/site_repository.dart';

/// Wires the site basics: datasource and repository, stateless singletons.
/// Use cases and cubits arrive with the screens that need them (010–015).
void registerSiteFeature(GetIt getIt) {
  getIt
    ..registerLazySingleton<SiteRemoteDataSource>(
      () => SiteRemoteDataSourceImpl(getIt<Dio>()),
    )
    ..registerLazySingleton<SiteRepository>(
      () => SiteRepositoryImpl(getIt<SiteRemoteDataSource>()),
    );
}
