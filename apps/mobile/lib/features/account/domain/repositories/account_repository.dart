import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/account/domain/entities/account.dart';

/// The signed-in client's own account (feature 013, `contracts/account-api.md`). Everything is
/// the person's own data; nothing is stored on the device.
abstract interface class AccountRepository {
  /// `GET me/account`. A creator account answers a not-found failure.
  Future<Result<AccountHome>> getHome();

  /// `GET me/bookings`.
  Future<Result<BookingList>> getBookings({int page = 1});

  /// `GET me/briefs`.
  Future<Result<BriefList>> getBriefs({int page = 1});

  /// `PATCH me` with the name and/or email. A 422 comes back as a failure whose field codes name
  /// `body.email` or `body.name`.
  Future<Result<void>> updateDetails({String? name, String? email});

  /// `PATCH me {finishShown: true}`: "Finish your account" has been shown (FR-020).
  Future<Result<void>> markFinishShown();
}
