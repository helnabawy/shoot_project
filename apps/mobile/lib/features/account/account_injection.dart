import 'package:dio/dio.dart';
import 'package:get_it/get_it.dart';
import 'package:shoot_mobile/features/account/data/datasources/account_remote_data_source.dart';
import 'package:shoot_mobile/features/account/data/repositories/account_repository_impl.dart';
import 'package:shoot_mobile/features/account/domain/repositories/account_repository.dart';
import 'package:shoot_mobile/features/account/domain/usecases/account_use_cases.dart';
import 'package:shoot_mobile/features/account/presentation/cubit/account_cubit.dart';
import 'package:shoot_mobile/features/account/presentation/cubit/bookings_cubit.dart';

/// Wires the client account (feature 013). The cubits are factories: the router makes them when an
/// account screen opens and closes them when the person leaves, so nothing personal is kept.
void registerAccountFeature(GetIt getIt) {
  getIt
    ..registerLazySingleton<AccountRemoteDataSource>(
      () => AccountRemoteDataSourceImpl(getIt<Dio>()),
    )
    ..registerLazySingleton<AccountRepository>(
      () => AccountRepositoryImpl(getIt<AccountRemoteDataSource>()),
    )
    ..registerLazySingleton(() => GetAccountHome(getIt<AccountRepository>()))
    ..registerLazySingleton(() => GetBookings(getIt<AccountRepository>()))
    ..registerLazySingleton(() => GetBriefs(getIt<AccountRepository>()))
    ..registerLazySingleton(() => UpdateDetails(getIt<AccountRepository>()))
    ..registerLazySingleton(() => MarkFinishShown(getIt<AccountRepository>()))
    ..registerFactory(
      () => AccountCubit(
        getHome: getIt<GetAccountHome>(),
        updateDetails: getIt<UpdateDetails>(),
        markFinishShown: getIt<MarkFinishShown>(),
      ),
    )
    ..registerFactory(
      () => BookingsCubit(
        getBookings: getIt<GetBookings>(),
        getBriefs: getIt<GetBriefs>(),
      ),
    );
}
