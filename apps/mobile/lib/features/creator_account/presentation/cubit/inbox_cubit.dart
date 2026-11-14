import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/creator_account/domain/entities/inbox.dart';
import 'package:shoot_mobile/features/creator_account/domain/repositories/inbox_repository.dart';

sealed class InboxState extends Equatable {
  const InboxState();

  @override
  List<Object?> get props => [];
}

final class InboxLoading extends InboxState {
  const InboxLoading();
}

final class InboxFailed extends InboxState {
  const InboxFailed(this.failure);

  final Failure failure;

  @override
  List<Object?> get props => [failure];
}

final class InboxLoaded extends InboxState {
  const InboxLoaded(this.inbox, {this.busyKey, this.failure});

  final CreatorInbox inbox;

  /// The brief and type whose answer is being sent (its buttons wait).
  final String? busyKey;

  /// The last answer that did not go through (a closed brief, no connection); the list stays.
  final Failure? failure;

  InboxLoaded copyWith({
    String? busyKey,
    bool clearBusy = false,
    Failure? failure,
    bool clearFailure = false,
  }) => InboxLoaded(
    inbox,
    busyKey: clearBusy ? null : (busyKey ?? this.busyKey),
    failure: clearFailure ? null : (failure ?? this.failure),
  );

  @override
  List<Object?> get props => [inbox, busyKey, failure];
}

/// The creator brief inbox (feature 019): accept, reject with an optional reason, undo, withdraw.
class InboxCubit extends Cubit<InboxState> {
  InboxCubit(this._repository) : super(const InboxLoading());

  final InboxRepository _repository;

  Future<void> load() async {
    emit(const InboxLoading());
    switch (await _repository.inbox()) {
      case Ok(:final value):
        emit(InboxLoaded(value));
      case Err(:final failure):
        emit(InboxFailed(failure));
    }
  }

  Future<void> _run(
    BriefItem item,
    Future<Result<CreatorInbox>> Function() call,
  ) async {
    final s = state;
    if (s is! InboxLoaded || s.busyKey != null) return;
    emit(s.copyWith(busyKey: item.key, clearFailure: true));
    switch (await call()) {
      case Ok(:final value):
        emit(InboxLoaded(value));
      case Err(:final failure):
        emit(s.copyWith(clearBusy: true, failure: failure));
    }
  }

  Future<void> accept(BriefItem item) =>
      _run(item, () => _repository.accept(item));

  /// [reason] and [note] are optional.
  Future<void> reject(BriefItem item, {String? reason, String? note}) =>
      _run(item, () => _repository.reject(item, reason: reason, note: note));

  Future<void> withdraw(BriefItem item) =>
      _run(item, () => _repository.withdraw(item));
}
