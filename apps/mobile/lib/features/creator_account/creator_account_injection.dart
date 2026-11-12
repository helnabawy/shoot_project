import 'package:dio/dio.dart';
import 'package:get_it/get_it.dart';
import 'package:shoot_mobile/core/time/clock.dart';
import 'package:shoot_mobile/features/creator_account/data/datasources/creator_account_remote_data_source.dart';
import 'package:shoot_mobile/features/creator_account/data/repositories/creator_account_repository_impl.dart';
import 'package:shoot_mobile/features/creator_account/domain/repositories/creator_account_repository.dart';
import 'package:shoot_mobile/features/creator_account/presentation/cubit/account_cubit.dart';
import 'package:shoot_mobile/features/creator_account/presentation/cubit/availability_cubit.dart';
import 'package:shoot_mobile/features/creator_account/presentation/cubit/bookings_cubit.dart';
import 'package:shoot_mobile/features/creator_account/presentation/cubit/profile_cubit.dart';

/// The picker until the platform one (camera, library, files) is built: it reports that access is
/// not available, so the screen shows its one-line explanation. Replacing it is one registration
/// (see the plan's Complexity Tracking: `image_picker` and `file_picker` need the owner's approval).
final class UnavailableFilePicker implements FilePicker {
  const UnavailableFilePicker();

  @override
  Future<PickedFile?> pick(PickSource source) => throw const PickDenied();
}

/// Wires the creator account (feature 014). Cubits are factories: each screen makes its own.
void registerCreatorAccountFeature(GetIt getIt) {
  getIt
    ..registerLazySingleton<CreatorAccountRemoteDataSource>(
      () => CreatorAccountRemoteDataSourceImpl(getIt<Dio>()),
    )
    ..registerLazySingleton<CreatorAccountRepository>(
      () =>
          CreatorAccountRepositoryImpl(getIt<CreatorAccountRemoteDataSource>()),
    )
    ..registerLazySingleton<FilePicker>(() => const UnavailableFilePicker())
    ..registerFactory(() => AccountCubit(getIt<CreatorAccountRepository>()))
    ..registerFactory(
      () => ProfileCubit(
        repository: getIt<CreatorAccountRepository>(),
        picker: getIt<FilePicker>(),
      ),
    )
    ..registerFactory(
      () => BookingsCubit(
        repository: getIt<CreatorAccountRepository>(),
        clock: getIt<Clock>(),
      ),
    )
    ..registerFactory(
      () => AvailabilityCubit(getIt<CreatorAccountRepository>()),
    );
}
