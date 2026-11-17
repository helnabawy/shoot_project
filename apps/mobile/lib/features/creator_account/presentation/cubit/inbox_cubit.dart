import 'dart:async';

import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/network/stamp_poller.dart';
import 'package:shoot_mobile/core/push/push_service.dart';
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
/// Feature 022: accept the client's price or offer another, and stay live while open: a matching
/// push reloads at once, and the inbox re-checks its fingerprint every few seconds (FR-023, FR-024).
class InboxCubit extends Cubit<InboxState> {
  InboxCubit(this._repository, {Stream<PushEvent>? pushEvents})
    : super(const InboxLoading()) {
    _poller = StampPoller(
      read: () async => switch (await _repository.stamp()) {
        Ok(:final value) => value,
        Err() => null,
      },
      onChanged: refresh,
    );
    _push = pushEvents
        ?.where((e) => _liveEvents.contains(e.event))
        .listen((_) => refresh());
  }

  final InboxRepository _repository;
  late final StampPoller _poller;
  StreamSubscription<PushEvent>? _push;

  static const _liveEvents = {'brief-new', 'offer-declined', 'offer-lost'};

  /// Starts the live re-check (the page is visible and the app in front).
  void startLive() => _poller.start();

  void stopLive() => _poller.stop();

  /// Reloads quietly, keeping the list on screen (no loading state).
  Future<void> refresh() async {
    final s = state;
    if (s is InboxLoaded && s.busyKey != null) return;
    if (await _repository.inbox() case Ok(:final value)) {
      if (!isClosed) emit(InboxLoaded(value));
    }
  }

  @override
  Future<void> close() async {
    _poller.stop();
    await _push?.cancel();
    return super.close();
  }

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

  /// [amountFils]: an offer on an offers brief; `null` accepts the client's price (022).
  Future<void> accept(BriefItem item, {int? amountFils}) =>
      _run(item, () => _repository.accept(item, amountFils: amountFils));

  /// [reason] and [note] are optional.
  Future<void> reject(BriefItem item, {String? reason, String? note}) =>
      _run(item, () => _repository.reject(item, reason: reason, note: note));

  Future<void> withdraw(BriefItem item) =>
      _run(item, () => _repository.withdraw(item));
}
