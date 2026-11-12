import 'package:dio/dio.dart';
import 'package:get_it/get_it.dart';
import 'package:shoot_mobile/core/auth/session_cubit.dart';
import 'package:shoot_mobile/core/time/clock.dart';
import 'package:shoot_mobile/features/quick_match/data/datasources/quick_match_remote_data_source.dart';
import 'package:shoot_mobile/features/quick_match/data/repositories/quick_match_repository_impl.dart';
import 'package:shoot_mobile/features/quick_match/domain/repositories/quick_match_repository.dart';
import 'package:shoot_mobile/features/quick_match/presentation/cubit/book_flow_cubit.dart';
import 'package:shoot_mobile/features/quick_match/presentation/cubit/booking_view_cubit.dart';
import 'package:shoot_mobile/features/quick_match/presentation/cubit/match_cubit.dart';
import 'package:shoot_mobile/features/quick_match/presentation/quick_match_routes.dart';
import 'package:shoot_mobile/features/sign_in/domain/usecases/request_code.dart';
import 'package:shoot_mobile/features/sign_in/domain/usecases/verify_code.dart';

/// Wires Quick Match steps 2 to 4 and the booking pages (feature 012). The cubits are made by the
/// routes, one set per brief ([QuickMatchFlows]) and one per quotation screen.
void registerQuickMatchFeature(GetIt getIt) {
  getIt
    ..registerLazySingleton<QuickMatchRemoteDataSource>(
      () => QuickMatchRemoteDataSourceImpl(getIt<Dio>()),
    )
    ..registerLazySingleton<QuickMatchRepository>(
      () => QuickMatchRepositoryImpl(getIt<QuickMatchRemoteDataSource>()),
    )
    ..registerLazySingleton<QuickMatchFlows>(
      () => QuickMatchFlows(
        (ref, key) => QuickMatchFlow(
          match: MatchCubit(
            repository: getIt<QuickMatchRepository>(),
            ref: ref,
            key: key,
          ),
          book: BookFlowCubit(
            repository: getIt<QuickMatchRepository>(),
            requestCode: getIt<RequestCode>(),
            verifyCode: getIt<VerifyCode>(),
            session: getIt<SessionCubit>(),
            clock: getIt<Clock>(),
            ref: ref,
            key: key,
          ),
        ),
      ),
    )
    ..registerFactoryParam<BookingViewCubit, ({String ref, String key}), void>(
      (p, _) => BookingViewCubit(
        repository: getIt<QuickMatchRepository>(),
        ref: p.ref,
        key: p.key,
      ),
    );
}
