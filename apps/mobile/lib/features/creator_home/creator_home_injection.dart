import 'package:dio/dio.dart';
import 'package:get_it/get_it.dart';
import 'package:shoot_mobile/features/creator_account/data/datasources/creator_account_remote_data_source.dart';
import 'package:shoot_mobile/features/creator_account/data/datasources/inbox_remote_data_source.dart';
import 'package:shoot_mobile/features/creator_home/data/datasources/creator_home_remote_data_source.dart';
import 'package:shoot_mobile/features/creator_home/data/repositories/creator_home_repository_impl.dart';
import 'package:shoot_mobile/features/creator_home/domain/repositories/creator_home_repository.dart';
import 'package:shoot_mobile/features/creator_home/presentation/cubit/creator_home_cubit.dart';

/// Wires the creator home (feature 023). It reads one endpoint of its own and answers through the
/// creator account's and the inbox's data sources, so register it after
/// `registerCreatorAccountFeature`. The cubit is a factory: each screen makes its own.
void registerCreatorHomeFeature(GetIt getIt) {
  getIt
    ..registerLazySingleton<CreatorHomeRemoteDataSource>(
      () => CreatorHomeRemoteDataSourceImpl(getIt<Dio>()),
    )
    ..registerLazySingleton<CreatorHomeRepository>(
      () => CreatorHomeRepositoryImpl(
        getIt<CreatorHomeRemoteDataSource>(),
        getIt<CreatorAccountRemoteDataSource>(),
        getIt<InboxRemoteDataSource>(),
      ),
    )
    ..registerFactory(() => CreatorHomeCubit(getIt<CreatorHomeRepository>()));
}
