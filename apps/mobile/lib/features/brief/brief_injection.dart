import 'package:dio/dio.dart';
import 'package:get_it/get_it.dart';
import 'package:shoot_mobile/core/time/clock.dart';
import 'package:shoot_mobile/features/brief/data/brief_data.dart';
import 'package:shoot_mobile/features/brief/domain/brief_receipt.dart';
import 'package:shoot_mobile/features/brief/presentation/brief_cubit.dart';
import 'package:shoot_mobile/features/site/domain/repositories/site_repository.dart';

/// Wires the brief (feature 010). The cubit is one instance for the whole app run, so a half-built
/// brief survives leaving the landing and is lost when the app closes (spec edge case).
void registerBriefFeature(GetIt getIt) {
  getIt
    ..registerLazySingleton<BriefRepository>(
      () => BriefRepositoryImpl(getIt<Dio>()),
    )
    ..registerLazySingleton<BriefCubit>(
      () => BriefCubit(
        loadBuilder: getIt<SiteRepository>().getBriefBuilder,
        repository: getIt<BriefRepository>(),
        clock: getIt<Clock>(),
      ),
    );
}
