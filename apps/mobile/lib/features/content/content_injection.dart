import 'package:dio/dio.dart';
import 'package:get_it/get_it.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/time/clock.dart';
import 'package:shoot_mobile/core/usecase/use_case.dart';
import 'package:shoot_mobile/core/web/website_links.dart';
import 'package:shoot_mobile/features/content/data/datasources/content_remote_data_source.dart';
import 'package:shoot_mobile/features/content/data/datasources/path_status_remote_data_source.dart';
import 'package:shoot_mobile/features/content/data/repositories/content_repository_impl.dart';
import 'package:shoot_mobile/features/content/data/repositories/path_status_repository_impl.dart';
import 'package:shoot_mobile/features/content/domain/repositories/content_repository.dart';
import 'package:shoot_mobile/features/content/domain/repositories/path_status_repository.dart';
import 'package:shoot_mobile/features/content/domain/usecases/check_path.dart';
import 'package:shoot_mobile/features/content/domain/usecases/get_guides.dart';
import 'package:shoot_mobile/features/content/domain/usecases/get_legal.dart';
import 'package:shoot_mobile/features/content/domain/usecases/open_whatsapp.dart';
import 'package:shoot_mobile/features/content/presentation/content_deps.dart';
import 'package:shoot_mobile/features/content/presentation/cubit/content_loaders.dart';
import 'package:shoot_mobile/features/site/domain/repositories/site_repository.dart';

/// Wires guides, editor pages and legal documents (008 data layer) and their screens (015): the
/// datasources and repositories, the use cases, and the [ContentDeps] the routes provide. All
/// stateless singletons; each screen's cubit is made by the screen.
void registerContentFeature(GetIt getIt) {
  getIt
    ..registerLazySingleton<ContentRemoteDataSource>(
      () => ContentRemoteDataSourceImpl(getIt<Dio>()),
    )
    ..registerLazySingleton<ContentRepository>(
      () => ContentRepositoryImpl(getIt<ContentRemoteDataSource>()),
    )
    ..registerLazySingleton<PathStatusRemoteDataSource>(
      () => PathStatusRemoteDataSourceImpl(getIt<Dio>()),
    )
    ..registerLazySingleton<PathStatusRepository>(
      () => PathStatusRepositoryImpl(getIt<PathStatusRemoteDataSource>()),
    )
    ..registerLazySingleton<ContentDeps>(() {
      final content = getIt<ContentRepository>();
      final site = getIt<SiteRepository>();
      final openWhatsapp = OpenWhatsApp(site, openInBrowser);
      return ContentDeps(
        loaders: ContentLoaders(
          getGuides: GetGuides(content),
          getArticle: GetArticle(content),
          getPage: GetPage(content),
          getLegal: GetLegal(content),
          getLegalVersion: GetLegalVersion(content),
          getLegalVersions: GetLegalVersions(content),
          isRemoved: IsRemovedPath(getIt<PathStatusRepository>()),
        ),
        openWhatsapp: () async =>
            switch (await openWhatsapp(const NoParams())) {
              Ok(:final value) => value,
              Err() => false,
            },
        links: getIt<WebsiteLinks>(),
        clock: getIt<Clock>(),
      );
    });
}
