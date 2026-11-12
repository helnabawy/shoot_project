import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/account/domain/entities/account.dart';
import 'package:shoot_mobile/features/account/domain/usecases/account_use_cases.dart';

enum AccountStatus { loading, ready, failed }

/// A form in "Finish your account" being saved or refused.
enum SaveStatus { idle, saving, failed }

final class AccountState extends Equatable {
  const AccountState({
    this.status = AccountStatus.loading,
    this.home,
    this.failure,
    this.save = SaveStatus.idle,
    this.fieldError,
  });

  final AccountStatus status;
  final AccountHome? home;
  final Failure? failure;
  final SaveStatus save;

  /// The server's or local field message key (`account.errors.emailInUse`, …) after a refused save.
  final String? fieldError;

  AccountState copyWith({
    AccountStatus? status,
    AccountHome? home,
    Failure? failure,
    SaveStatus? save,
    String? Function()? fieldError,
  }) => AccountState(
    status: status ?? this.status,
    home: home ?? this.home,
    failure: failure,
    save: save ?? this.save,
    fieldError: fieldError == null ? this.fieldError : fieldError(),
  );

  @override
  List<Object?> get props => [status, home, failure, save, fieldError];
}

final _email = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');

/// The client's account, shared by My account (24), Finish your account (25) and the Settings tab
/// of Your bookings (26): one read, the details saves and the shown-once mark.
class AccountCubit extends Cubit<AccountState> {
  AccountCubit({
    required this._getHome,
    required this._updateDetails,
    required this._markFinishShown,
  }) : super(const AccountState());

  final GetAccountHome _getHome;
  final UpdateDetails _updateDetails;
  final MarkFinishShown _markFinishShown;

  /// Reads the account. A refresh keeps what is on screen until the new answer arrives.
  Future<void> load({bool refresh = false}) async {
    if (!refresh || state.home == null) {
      emit(state.copyWith(status: AccountStatus.loading));
    }
    switch (await _getHome()) {
      case Ok(:final value):
        if (isClosed) return;
        emit(
          AccountState(
            status: AccountStatus.ready,
            home: value,
            fieldError: state.fieldError,
          ),
        );
      case Err(:final failure):
        if (isClosed) return;
        emit(state.copyWith(status: AccountStatus.failed, failure: failure));
    }
  }

  /// "Finish your account" is being shown: the server never opens it on its own again (FR-020).
  /// Fire and forget; a failure only means it may open once more.
  Future<void> markFinishShown() async {
    final home = state.home;
    if (home == null || !home.finishAutoOpen) return;
    emit(state.copyWith(home: home.copyWith(finishAutoOpen: false)));
    await _markFinishShown();
  }

  void clearFieldError() {
    if (state.fieldError != null || state.save == SaveStatus.failed) {
      emit(state.copyWith(save: SaveStatus.idle, fieldError: () => null));
    }
  }

  /// Saves the name; true when it was saved.
  Future<bool> saveName(String value) async {
    final name = value.trim();
    if (name.length < 2 || name.length > 80) {
      emit(
        state.copyWith(
          save: SaveStatus.failed,
          fieldError: () => 'account.errors.nameLength',
        ),
      );
      return false;
    }
    return _save(name: name);
  }

  /// Saves the email after checking its form; true when it was saved.
  Future<bool> saveEmail(String value) async {
    final email = value.trim();
    if (!_email.hasMatch(email) || email.length > 254) {
      emit(
        state.copyWith(
          save: SaveStatus.failed,
          fieldError: () => 'account.errors.emailInvalid',
        ),
      );
      return false;
    }
    return _save(email: email);
  }

  Future<bool> _save({String? name, String? email}) async {
    emit(state.copyWith(save: SaveStatus.saving, fieldError: () => null));
    switch (await _updateDetails(name: name, email: email)) {
      case Ok():
        await load(refresh: true);
        if (isClosed) return true;
        emit(state.copyWith(save: SaveStatus.idle, fieldError: () => null));
        return true;
      case Err(:final failure):
        if (isClosed) return false;
        final code = failure is ServerFailure
            ? failure.fieldCode('body.email') ?? failure.fieldCode('body.name')
            : null;
        emit(
          state.copyWith(
            save: SaveStatus.failed,
            failure: failure,
            fieldError: () => code ?? 'api.errors.unexpected',
          ),
        );
        return false;
    }
  }
}
