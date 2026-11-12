import 'dart:async';

import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/account/domain/entities/account.dart';
import 'package:shoot_mobile/features/account/domain/usecases/account_use_cases.dart';

enum ListStatus { loading, ready, failed }

enum BookingsTab { bookings, briefs, settings }

final class BookingsState extends Equatable {
  const BookingsState({
    this.tab = BookingsTab.bookings,
    this.status = ListStatus.loading,
    this.upcoming = const [],
    this.past = const [],
    this.page = 1,
    this.hasMore = false,
    this.loadingMore = false,
    this.briefsStatus = ListStatus.loading,
    this.briefs = const [],
    this.briefsPage = 1,
    this.briefsHasMore = false,
    this.failure,
  });

  final BookingsTab tab;
  final ListStatus status;
  final List<BookingSummary> upcoming;
  final List<BookingSummary> past;
  final int page;
  final bool hasMore;
  final bool loadingMore;
  final ListStatus briefsStatus;
  final List<BriefSummary> briefs;
  final int briefsPage;
  final bool briefsHasMore;
  final Failure? failure;

  bool get empty => upcoming.isEmpty && past.isEmpty;

  BookingsState copyWith({
    BookingsTab? tab,
    ListStatus? status,
    List<BookingSummary>? upcoming,
    List<BookingSummary>? past,
    int? page,
    bool? hasMore,
    bool? loadingMore,
    ListStatus? briefsStatus,
    List<BriefSummary>? briefs,
    int? briefsPage,
    bool? briefsHasMore,
    Failure? failure,
  }) => BookingsState(
    tab: tab ?? this.tab,
    status: status ?? this.status,
    upcoming: upcoming ?? this.upcoming,
    past: past ?? this.past,
    page: page ?? this.page,
    hasMore: hasMore ?? this.hasMore,
    loadingMore: loadingMore ?? this.loadingMore,
    briefsStatus: briefsStatus ?? this.briefsStatus,
    briefs: briefs ?? this.briefs,
    briefsPage: briefsPage ?? this.briefsPage,
    briefsHasMore: briefsHasMore ?? this.briefsHasMore,
    failure: failure,
  );

  @override
  List<Object?> get props => [
    tab,
    status,
    upcoming,
    past,
    page,
    hasMore,
    loadingMore,
    briefsStatus,
    briefs,
    briefsPage,
    briefsHasMore,
    failure,
  ];
}

/// Your bookings (26): Upcoming and Past, paged as the person scrolls; the Briefs tab lists all
/// briefs. Reading again (pull to refresh, reopening) shows a changed state's new badge (US2-S6).
class BookingsCubit extends Cubit<BookingsState> {
  BookingsCubit({required this._getBookings, required this._getBriefs})
    : super(const BookingsState());

  final GetBookings _getBookings;
  final GetBriefs _getBriefs;

  void selectTab(BookingsTab tab) {
    if (tab == state.tab) return;
    emit(state.copyWith(tab: tab));
    if (tab == BookingsTab.briefs && state.briefs.isEmpty) {
      unawaited(loadBriefs());
    }
  }

  Future<void> load() async {
    emit(state.copyWith(status: ListStatus.loading));
    switch (await _getBookings()) {
      case Ok(:final value):
        if (isClosed) return;
        emit(
          state.copyWith(
            status: ListStatus.ready,
            upcoming: value.upcoming,
            past: value.past,
            page: value.page,
            hasMore: value.hasMore,
            loadingMore: false,
          ),
        );
      case Err(:final failure):
        if (isClosed) return;
        emit(state.copyWith(status: ListStatus.failed, failure: failure));
    }
  }

  Future<void> loadMore() async {
    if (!state.hasMore || state.loadingMore) return;
    emit(state.copyWith(loadingMore: true));
    switch (await _getBookings(page: state.page + 1)) {
      case Ok(:final value):
        if (isClosed) return;
        emit(
          state.copyWith(
            past: [...state.past, ...value.past],
            page: value.page,
            hasMore: value.hasMore,
            loadingMore: false,
          ),
        );
      case Err():
        if (isClosed) return;
        emit(state.copyWith(loadingMore: false));
    }
  }

  Future<void> loadBriefs() async {
    emit(state.copyWith(briefsStatus: ListStatus.loading));
    switch (await _getBriefs()) {
      case Ok(:final value):
        if (isClosed) return;
        emit(
          state.copyWith(
            briefsStatus: ListStatus.ready,
            briefs: value.items,
            briefsPage: value.page,
            briefsHasMore: value.hasMore,
          ),
        );
      case Err(:final failure):
        if (isClosed) return;
        emit(state.copyWith(briefsStatus: ListStatus.failed, failure: failure));
    }
  }

  Future<void> loadMoreBriefs() async {
    if (!state.briefsHasMore) return;
    switch (await _getBriefs(page: state.briefsPage + 1)) {
      case Ok(:final value):
        if (isClosed) return;
        emit(
          state.copyWith(
            briefs: [...state.briefs, ...value.items],
            briefsPage: value.page,
            briefsHasMore: value.hasMore,
          ),
        );
      case Err():
        break;
    }
  }
}
