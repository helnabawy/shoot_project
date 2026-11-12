import 'package:shoot_mobile/core/error/api_result.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/account/data/datasources/account_remote_data_source.dart';
import 'package:shoot_mobile/features/account/data/models/account_models.dart';
import 'package:shoot_mobile/features/account/domain/entities/account.dart';
import 'package:shoot_mobile/features/account/domain/repositories/account_repository.dart';

/// Turns datasource exceptions into failures (see [apiResult]) and models into entities.
final class AccountRepositoryImpl implements AccountRepository {
  const AccountRepositoryImpl(this._remote);

  final AccountRemoteDataSource _remote;

  @override
  Future<Result<AccountHome>> getHome() =>
      apiResult(() async => (await _remote.fetchHome()).toEntity());

  @override
  Future<Result<BookingList>> getBookings({int page = 1}) =>
      apiResult(() async => (await _remote.fetchBookings(page)).toEntity());

  @override
  Future<Result<BriefList>> getBriefs({int page = 1}) =>
      apiResult(() async => (await _remote.fetchBriefs(page)).toEntity());

  @override
  Future<Result<void>> updateDetails({String? name, String? email}) =>
      apiResult(() => _remote.update(MeUpdateModel(name: name, email: email)));

  @override
  Future<Result<void>> markFinishShown() =>
      apiResult(() => _remote.update(const MeUpdateModel(finishShown: true)));
}
