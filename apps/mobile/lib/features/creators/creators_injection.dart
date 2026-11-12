import 'package:dio/dio.dart';
import 'package:get_it/get_it.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/time/clock.dart';
import 'package:shoot_mobile/core/web/website_links.dart';
import 'package:shoot_mobile/features/creators/data/datasources/creators_remote_data_source.dart';
import 'package:shoot_mobile/features/creators/data/repositories/creators_repository_impl.dart';
import 'package:shoot_mobile/features/creators/domain/repositories/creators_repository.dart';
import 'package:shoot_mobile/features/creators/domain/usecases/creator_use_cases.dart';
import 'package:shoot_mobile/features/creators/domain/usecases/get_brief_context.dart';
import 'package:shoot_mobile/features/creators/presentation/creators_routes.dart';
import 'package:shoot_mobile/features/creators/presentation/cubit/book_hire_cubits.dart';
import 'package:shoot_mobile/features/creators/presentation/cubit/brief_cubit.dart';
import 'package:shoot_mobile/features/creators/presentation/cubit/directory_cubit.dart';
import 'package:shoot_mobile/features/creators/presentation/cubit/profile_cubit.dart';
import 'package:shoot_mobile/features/creators/presentation/cubit/specialty_cubit.dart';
import 'package:shoot_mobile/features/site/domain/repositories/site_repository.dart';

/// Wires creators (feature 011): datasource, repository and use cases are stateless singletons;
/// the cubits are made by the routes when a screen opens ([creatorsRoutesFrom]); the brief draft
/// is one object for the app's lifetime so a changed creator keeps the answers.
void registerCreatorsFeature(GetIt getIt) {
  getIt
    ..registerLazySingleton<CreatorsRemoteDataSource>(
      () => CreatorsRemoteDataSourceImpl(getIt<Dio>()),
    )
    ..registerLazySingleton<CreatorsRepository>(
      () => CreatorsRepositoryImpl(getIt<CreatorsRemoteDataSource>()),
    )
    ..registerLazySingleton(() => GetCreators(getIt<CreatorsRepository>()))
    ..registerLazySingleton(
      () => GetCreatorProfile(getIt<CreatorsRepository>()),
    )
    ..registerLazySingleton(() => GetSpecialtyPage(getIt<CreatorsRepository>()))
    ..registerLazySingleton(() => GetHirePage(getIt<CreatorsRepository>()))
    ..registerLazySingleton(() => GetBriefContext(getIt<SiteRepository>()))
    ..registerLazySingleton(() => GetWhatsappNumber(getIt<SiteRepository>()))
    ..registerLazySingleton(BriefDraft.new);
}

/// The feature's routes from the service locator (called once from the app shell).
List<RouteBase> creatorsRoutesFrom(GetIt getIt) => creatorsRoutes(
  createDirectory: (initial) =>
      DirectoryCubit(getIt<GetCreators>(), initial: initial),
  createProfile: (code) => ProfileCubit(
    getProfile: getIt<GetCreatorProfile>(),
    getWhatsappNumber: getIt<GetWhatsappNumber>(),
    code: code,
  ),
  createBook: (code) => BookCubit(
    getProfile: getIt<GetCreatorProfile>(),
    getContext: getIt<GetBriefContext>(),
    code: code,
  ),
  createSpecialty: (slug) =>
      SpecialtyCubit(getIt<GetSpecialtyPage>(), slug: slug),
  createHire: (slug) => HireCubit(
    getHirePage: getIt<GetHirePage>(),
    getWhatsappNumber: getIt<GetWhatsappNumber>(),
    slug: slug,
  ),
  draft: getIt<BriefDraft>(),
  clock: getIt<Clock>(),
  links: getIt<WebsiteLinks>(),
  open: openInBrowser,
);
