import 'package:dio/dio.dart';
import 'package:get_it/get_it.dart';
import 'package:shoot_mobile/features/links/data/datasources/links_remote_data_source.dart';
import 'package:shoot_mobile/features/links/data/repositories/links_repository_impl.dart';
import 'package:shoot_mobile/features/links/domain/repositories/links_repository.dart';

/// Wires the link resolver: datasource and repository, stateless singletons. The screens that
/// open a resolved link arrive with 015.
void registerLinksFeature(GetIt getIt) {
  getIt
    ..registerLazySingleton<LinksRemoteDataSource>(
      () => LinksRemoteDataSourceImpl(getIt<Dio>()),
    )
    ..registerLazySingleton<LinksRepository>(
      () => LinksRepositoryImpl(getIt<LinksRemoteDataSource>()),
    );
}
