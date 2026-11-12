import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/time/clock.dart';
import 'package:shoot_mobile/features/creator_account/domain/entities/creator_account.dart';
import 'package:shoot_mobile/features/creator_account/domain/repositories/creator_account_repository.dart';

sealed class BookingsState extends Equatable {
  const BookingsState();

  @override
  List<Object?> get props => [];
}

final class BookingsLoading extends BookingsState {
  const BookingsLoading();
}

final class BookingsFailed extends BookingsState {
  const BookingsFailed(this.failure);

  final Failure failure;

  @override
  List<Object?> get props => [failure];
}

final class BookingsLoaded extends BookingsState {
  const BookingsLoaded({
    required this.bookings,
    required this.now,
    this.busyRef,
    this.failure,
  });

  final CreatorBookings bookings;
  final DateTime now;

  /// The booking an answer is being sent for.
  final String? busyRef;
  final Failure? failure;

  bool _open(BookingRequest r) =>
      r.answer == RequestAnswer.pending &&
      (r.respondBy == null || r.respondBy!.isAfter(now));

  /// Requests that wait for an answer, nearest deadline first (FR-041). A request past its
  /// deadline is no longer offered.
  List<BookingRequest> get waiting =>
      bookings.waiting.where(_open).toList()..sort(_byDeadline);

  /// Requests whose deadline passed or that lapsed (a line says so).
  List<BookingRequest> get lapsed => [
    for (final r in bookings.waiting)
      if (!_open(r)) r,
  ];

  /// The screen's one primary action: the request with the nearest deadline.
  BookingRequest? get primary => waiting.isEmpty ? null : waiting.first;

  /// Bookings whose shoot day has passed and that can be marked delivered.
  List<BookingRequest> get deliverable => [
    for (final r in bookings.upcoming)
      if (r.canDeliver) r,
  ];

  List<BookingUpdate> get unread => [
    for (final u in bookings.updates)
      if (!u.read) u,
  ];

  static int _byDeadline(BookingRequest a, BookingRequest b) {
    final x = a.respondBy;
    final y = b.respondBy;
    if (x == null || y == null) return x == null ? (y == null ? 0 : 1) : -1;
    return x.compareTo(y);
  }

  BookingsLoaded copyWith({
    CreatorBookings? bookings,
    String? busyRef,
    bool clearBusy = false,
    Failure? failure,
    bool clearFailure = false,
  }) => BookingsLoaded(
    bookings: bookings ?? this.bookings,
    now: now,
    busyRef: clearBusy ? null : busyRef ?? this.busyRef,
    failure: clearFailure ? null : failure ?? this.failure,
  );

  @override
  List<Object?> get props => [bookings, now, busyRef, failure];
}

/// Bookings (screen 32): answer requests, mark delivered, mark updates read.
class BookingsCubit extends Cubit<BookingsState> {
  BookingsCubit({required this._repository, required this._clock})
    : super(const BookingsLoading());

  final CreatorAccountRepository _repository;
  final Clock _clock;

  Future<void> load() async {
    emit(const BookingsLoading());
    switch (await _repository.bookings()) {
      case Ok(:final value):
        emit(BookingsLoaded(bookings: value, now: _clock.now()));
      case Err(:final failure):
        emit(BookingsFailed(failure));
    }
  }

  Future<void> _run(
    String ref,
    Future<Result<CreatorBookings>> Function() call,
  ) async {
    final s = state;
    if (s is! BookingsLoaded || s.busyRef != null) return;
    emit(s.copyWith(busyRef: ref, clearFailure: true));
    switch (await call()) {
      case Ok(:final value):
        emit(BookingsLoaded(bookings: value, now: _clock.now()));
      case Err(:final failure):
        emit(s.copyWith(clearBusy: true, failure: failure));
    }
  }

  Future<void> confirm(String ref) =>
      _run(ref, () => _repository.answer(ref, confirm: true));

  /// [reason] is optional.
  Future<void> decline(String ref, {String? reason}) =>
      _run(ref, () => _repository.answer(ref, confirm: false, reason: reason));

  Future<void> markDelivered(String ref) =>
      _run(ref, () => _repository.deliver(ref));

  Future<void> markRead(String updateId) =>
      _run(updateId, () => _repository.markUpdateRead(updateId));
}
