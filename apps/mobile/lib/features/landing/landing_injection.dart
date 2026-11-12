import 'package:dio/dio.dart';
import 'package:get_it/get_it.dart';
import 'package:shoot_mobile/core/preferences/preferences_store.dart';
import 'package:shoot_mobile/features/landing/data/datasources/landing_remote_data_source.dart';
import 'package:shoot_mobile/features/landing/data/repositories/landing_repository_impl.dart';
import 'package:shoot_mobile/features/landing/domain/repositories/landing_repository.dart';
import 'package:shoot_mobile/features/landing/presentation/landing_cubit.dart';
import 'package:shoot_mobile/features/landing/presentation/landing_page.dart';
import 'package:shoot_mobile/features/site/domain/repositories/site_repository.dart';

/// Wires the landing: datasource and repository, stateless singletons, and
/// the landing screen's cubit (010).
void registerLandingFeature(GetIt getIt) {
  getIt
    ..registerLazySingleton<LandingRemoteDataSource>(
      () => LandingRemoteDataSourceImpl(getIt<Dio>()),
    )
    ..registerLazySingleton<LandingRepository>(
      () => LandingRepositoryImpl(getIt<LandingRemoteDataSource>()),
    )
    // Feature 010: the landing screen's cubit and its saved Pause choice.
    ..registerLazySingleton<LandingCubit>(
      () => LandingCubit(
        landing: getIt<LandingRepository>(),
        site: getIt<SiteRepository>(),
      ),
    )
    ..registerLazySingleton<LandingMotionStore>(
      () => LandingMotionStore(getIt<PreferencesStore>()),
    );
}
