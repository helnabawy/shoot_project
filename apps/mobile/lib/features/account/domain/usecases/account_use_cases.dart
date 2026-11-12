import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/account/domain/entities/account.dart';
import 'package:shoot_mobile/features/account/domain/repositories/account_repository.dart';

/// The account's use cases: each is one repository call the cubits name by intent.

final class GetAccountHome {
  const GetAccountHome(this._repository);

  final AccountRepository _repository;

  Future<Result<AccountHome>> call() => _repository.getHome();
}

final class GetBookings {
  const GetBookings(this._repository);

  final AccountRepository _repository;

  Future<Result<BookingList>> call({int page = 1}) =>
      _repository.getBookings(page: page);
}

final class GetBriefs {
  const GetBriefs(this._repository);

  final AccountRepository _repository;

  Future<Result<BriefList>> call({int page = 1}) =>
      _repository.getBriefs(page: page);
}

final class UpdateDetails {
  const UpdateDetails(this._repository);

  final AccountRepository _repository;

  Future<Result<void>> call({String? name, String? email}) =>
      _repository.updateDetails(name: name, email: email);
}

final class MarkFinishShown {
  const MarkFinishShown(this._repository);

  final AccountRepository _repository;

  Future<Result<void>> call() => _repository.markFinishShown();
}
