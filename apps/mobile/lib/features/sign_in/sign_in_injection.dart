import 'package:dio/dio.dart';
import 'package:get_it/get_it.dart';
import 'package:shoot_mobile/core/auth/session_cubit.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/time/clock.dart';
import 'package:shoot_mobile/features/sign_in/data/datasources/auth_remote_datasource.dart';
import 'package:shoot_mobile/features/sign_in/data/repositories/auth_repository_impl.dart';
import 'package:shoot_mobile/features/sign_in/domain/repositories/auth_repository.dart';
import 'package:shoot_mobile/features/sign_in/domain/usecases/request_code.dart';
import 'package:shoot_mobile/features/sign_in/domain/usecases/verify_code.dart';
import 'package:shoot_mobile/features/sign_in/presentation/cubit/sign_in_flow_cubit.dart';
import 'package:shoot_mobile/features/site/domain/repositories/site_repository.dart';

/// Wires sign-in by one-time code (feature 009). The flow cubit is a factory: the router makes
/// one when a sign-in screen opens and closes it when the person leaves them.
void registerSignInFeature(GetIt getIt) {
  getIt
    ..registerLazySingleton<AuthRemoteDataSource>(
      () => AuthRemoteDataSourceImpl(getIt<Dio>(), getIt<Clock>()),
    )
    ..registerLazySingleton<AuthRepository>(
      () => AuthRepositoryImpl(getIt<AuthRemoteDataSource>()),
    )
    ..registerLazySingleton(() => RequestCode(getIt<AuthRepository>()))
    ..registerLazySingleton(() => VerifyCode(getIt<AuthRepository>()))
    ..registerFactory(
      () => SignInFlowCubit(
        requestCode: getIt<RequestCode>(),
        verifyCode: getIt<VerifyCode>(),
        session: getIt<SessionCubit>(),
        clock: getIt<Clock>(),
        loadPersonas: () async =>
            switch (await getIt<SiteRepository>().getAudience()) {
              Ok(:final value) => Ok(value.personas),
              Err(:final failure) => Err(failure),
            },
      ),
    );
}
