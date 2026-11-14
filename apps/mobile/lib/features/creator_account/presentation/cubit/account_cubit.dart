import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/creator_account/domain/entities/creator_account.dart';
import 'package:shoot_mobile/features/creator_account/domain/repositories/creator_account_repository.dart';

sealed class AccountState extends Equatable {
  const AccountState();

  @override
  List<Object?> get props => [];
}

final class AccountLoading extends AccountState {
  const AccountLoading();
}

final class AccountFailed extends AccountState {
  const AccountFailed(this.failure);

  final Failure failure;

  @override
  List<Object?> get props => [failure];
}

/// What Up next offers (FR-002): the most urgent of a request to answer, open client briefs that
/// match (feature 019), a profile to finish (or resend after a document was not accepted), a
/// delivery to mark; else nothing.
enum UpNextKind { answerRequest, briefs, finishProfile, markDelivered, none }

final class AccountLoaded extends AccountState {
  const AccountLoaded(this.account);

  final CreatorAccount account;

  UpNextKind get upNext {
    if (account.waiting != null) return UpNextKind.answerRequest;
    if ((account.briefs?.count ?? 0) > 0) return UpNextKind.briefs;
    if (account.needs.any((n) => n.required.isNotEmpty)) {
      return UpNextKind.finishProfile;
    }
    if (account.deliverable != null) return UpNextKind.markDelivered;
    return UpNextKind.none;
  }

  @override
  List<Object?> get props => [account];
}

/// My account (screen 27).
class AccountCubit extends Cubit<AccountState> {
  AccountCubit(this._repository) : super(const AccountLoading());

  final CreatorAccountRepository _repository;

  Future<void> load() async {
    emit(const AccountLoading());
    switch (await _repository.account()) {
      case Ok(:final value):
        emit(AccountLoaded(value));
      case Err(:final failure):
        emit(AccountFailed(failure));
    }
  }
}
