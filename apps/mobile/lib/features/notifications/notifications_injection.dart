import 'package:dio/dio.dart';
import 'package:get_it/get_it.dart';
import 'package:shoot_mobile/core/push/push_service.dart';
import 'package:shoot_mobile/features/notifications/data/datasources/notifications_remote_data_source.dart';
import 'package:shoot_mobile/features/notifications/data/repositories/notifications_repository_impl.dart';
import 'package:shoot_mobile/features/notifications/domain/repositories/notifications_repository.dart';
import 'package:shoot_mobile/features/notifications/presentation/cubit/notifications_cubit.dart';

/// Wires Notifications (feature 024). The cubit is a factory: each screen makes its own.
void registerNotificationsFeature(GetIt getIt) {
  getIt
    ..registerLazySingleton<NotificationsRemoteDataSource>(
      () => NotificationsRemoteDataSourceImpl(getIt<Dio>()),
    )
    ..registerLazySingleton<NotificationsRepository>(
      () => NotificationsRepositoryImpl(getIt<NotificationsRemoteDataSource>()),
    )
    ..registerFactory(
      () => NotificationsCubit(
        getIt<NotificationsRepository>(),
        pushEvents: getIt.isRegistered<PushService>()
            ? getIt<PushService>().events
            : null,
      ),
    );
}
