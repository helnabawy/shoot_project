import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/creator_account/domain/entities/creator_account.dart';
import 'package:shoot_mobile/features/creator_account/domain/repositories/creator_account_repository.dart';

sealed class AvailabilityState extends Equatable {
  const AvailabilityState();

  @override
  List<Object?> get props => [];
}

final class AvailabilityLoading extends AvailabilityState {
  const AvailabilityLoading();
}

final class AvailabilityFailed extends AvailabilityState {
  const AvailabilityFailed(this.failure);

  final Failure failure;

  @override
  List<Object?> get props => [failure];
}

/// What a tap said when nothing changed or the save was undone.
enum DayNotice { booked, saved, outside }

final class AvailabilityLoaded extends AvailabilityState {
  const AvailabilityLoaded({
    required this.availability,
    required this.month,
    this.list = false,
    this.notice,
    this.failure,
  });

  final Availability availability;

  /// Any day in the month shown.
  final DateTime month;

  /// "See every day as a list".
  final bool list;
  final DayNotice? notice;
  final Failure? failure;

  DateTime get _firstMonth =>
      DateTime(availability.today.year, availability.today.month);

  DateTime get _lastMonth =>
      DateTime(availability.last.year, availability.last.month);

  bool get canGoBack => month.isAfter(_firstMonth);

  bool get canGoForward => month.isBefore(_lastMonth);

  /// Every day of the window, for the list view.
  List<DateTime> get window => [
    for (var i = 0; i < availability.windowDays; i++)
      DateTime(
        availability.today.year,
        availability.today.month,
        availability.today.day + i,
      ),
  ];

  AvailabilityLoaded copyWith({
    Availability? availability,
    DateTime? month,
    bool? list,
    DayNotice? notice,
    bool clearNotice = false,
    Failure? failure,
    bool clearFailure = false,
  }) => AvailabilityLoaded(
    availability: availability ?? this.availability,
    month: month ?? this.month,
    list: list ?? this.list,
    notice: clearNotice ? null : notice ?? this.notice,
    failure: clearFailure ? null : failure ?? this.failure,
  );

  @override
  List<Object?> get props => [availability, month, list, notice, failure];
}

/// Availability (screen 31): a tap blocks or frees a day and saves at once.
class AvailabilityCubit extends Cubit<AvailabilityState> {
  AvailabilityCubit(this._repository) : super(const AvailabilityLoading());

  final CreatorAccountRepository _repository;

  Future<void> load() async {
    emit(const AvailabilityLoading());
    switch (await _repository.availability()) {
      case Ok(:final value):
        emit(
          AvailabilityLoaded(
            availability: value,
            month: DateTime(value.today.year, value.today.month),
          ),
        );
      case Err(:final failure):
        emit(AvailabilityFailed(failure));
    }
  }

  AvailabilityLoaded? get _loaded => switch (state) {
    final AvailabilityLoaded s => s,
    _ => null,
  };

  void showList({required bool list}) {
    final s = _loaded;
    if (s != null) emit(s.copyWith(list: list, clearNotice: true));
  }

  void nextMonth() {
    final s = _loaded;
    if (s == null || !s.canGoForward) return;
    emit(
      s.copyWith(
        month: DateTime(s.month.year, s.month.month + 1),
        clearNotice: true,
      ),
    );
  }

  void previousMonth() {
    final s = _loaded;
    if (s == null || !s.canGoBack) return;
    emit(
      s.copyWith(
        month: DateTime(s.month.year, s.month.month - 1),
        clearNotice: true,
      ),
    );
  }

  /// Blocks a free day or frees a blocked one. Booked days and days outside the window do not
  /// change (a line says why); the day shows its new state at once and returns to the old one when
  /// the save fails.
  Future<void> toggle(DateTime day) async {
    final s = _loaded;
    if (s == null) return;
    final a = s.availability;
    if (a.kindOf(day) == DayKind.booked) {
      return emit(s.copyWith(notice: DayNotice.booked, clearFailure: true));
    }
    if (!a.inWindow(day)) {
      return emit(s.copyWith(notice: DayNotice.outside, clearFailure: true));
    }
    final block = a.kindOf(day) != DayKind.blocked;
    emit(
      s.copyWith(
        availability: a.withDay(day, block),
        clearNotice: true,
        clearFailure: true,
      ),
    );
    switch (await _repository.setDay(day, blocked: block)) {
      case Ok(:final value):
        final now = _loaded ?? s;
        emit(now.copyWith(availability: value, notice: DayNotice.saved));
      case Err(:final failure):
        final now = _loaded ?? s;
        emit(
          now.copyWith(
            availability: now.availability.withDay(day, !block),
            failure: failure,
            clearNotice: true,
          ),
        );
    }
  }
}
