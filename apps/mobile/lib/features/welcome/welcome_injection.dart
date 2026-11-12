import 'package:get_it/get_it.dart';
import 'package:shoot_mobile/core/first_run/first_run_store.dart';
import 'package:shoot_mobile/features/landing/domain/repositories/landing_repository.dart';
import 'package:shoot_mobile/features/site/domain/repositories/site_repository.dart';
import 'package:shoot_mobile/features/welcome/presentation/welcome_cubit.dart';

/// Wires the first visit (feature 010). A new [WelcomeCubit] per first visit.
void registerWelcomeFeature(GetIt getIt) {
  getIt.registerFactory<WelcomeCubit>(
    () => WelcomeCubit(
      landing: getIt<LandingRepository>(),
      site: getIt<SiteRepository>(),
      firstRun: getIt<FirstRunStore>(),
    ),
  );
}
