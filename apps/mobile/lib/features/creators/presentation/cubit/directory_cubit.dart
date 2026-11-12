import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shoot_mobile/core/content/creator_card.dart';
import 'package:shoot_mobile/core/content/pagination.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/creators/domain/entities/creators.dart';
import 'package:shoot_mobile/features/creators/domain/usecases/creator_use_cases.dart';

enum DirectoryStatus { loading, ready, loadingMore, failed }

/// Screen 15 (MC-US3): the cards loaded so far, the filters the answer offers and where the
/// paging stands.
final class DirectoryState extends Equatable {
  const DirectoryState({
    this.status = DirectoryStatus.loading,
    this.query = const CreatorQuery(),
    this.items = const [],
    this.filters = const [],
    this.pagination,
    this.failure,
  });

  final DirectoryStatus status;

  /// The filters (the page is the cubit's business).
  final CreatorQuery query;
  final List<CreatorCard> items;
  final List<DirectoryFilter> filters;
  final Pagination? pagination;
  final Failure? failure;

  int get shown => items.length;
  int get total => pagination?.total ?? 0;
  bool get canMore => pagination?.hasNext ?? false;
  bool get isEmpty => status == DirectoryStatus.ready && items.isEmpty;

  DirectoryFilter? filter(FilterKey key) {
    for (final f in filters) {
      if (f.key == key) return f;
    }
    return null;
  }

  DirectoryState copyWith({
    DirectoryStatus? status,
    CreatorQuery? query,
    List<CreatorCard>? items,
    List<DirectoryFilter>? filters,
    Pagination? pagination,
    Failure? failure,
  }) => DirectoryState(
    status: status ?? this.status,
    query: query ?? this.query,
    items: items ?? this.items,
    filters: filters ?? this.filters,
    pagination: pagination ?? this.pagination,
    failure: failure,
  );

  @override
  List<Object?> get props => [
    status,
    query,
    items,
    filters,
    pagination,
    failure,
  ];
}

/// The directory's filters and pages. A filter group holds one choice (the API takes one slug
/// per group); choosing the chosen one clears it. A changed filter restarts at page 1 and a late
/// answer to an older request is dropped.
class DirectoryCubit extends Cubit<DirectoryState> {
  DirectoryCubit(
    this._getCreators, {
    CreatorQuery initial = const CreatorQuery(),
  }) : super(DirectoryState(query: initial));

  final GetCreators _getCreators;
  int _generation = 0;

  Future<void> load() async {
    final generation = ++_generation;
    emit(state.copyWith(status: DirectoryStatus.loading, items: const []));
    final result = await _getCreators(_withPage(state.query, 1));
    if (generation != _generation) return;
    switch (result) {
      case Ok(:final value):
        emit(
          state.copyWith(
            status: DirectoryStatus.ready,
            items: value.items,
            filters: value.filters,
            pagination: value.pagination,
          ),
        );
      case Err(:final failure):
        emit(state.copyWith(status: DirectoryStatus.failed, failure: failure));
    }
  }

  Future<void> select(FilterKey key, String slug) {
    final q = state.query;
    String? pick(String? current) => current == slug ? null : slug;
    final next = switch (key) {
      FilterKey.type => CreatorQuery(
        type: pick(q.type),
        specialty: q.specialty,
        place: q.place,
      ),
      FilterKey.specialty => CreatorQuery(
        type: q.type,
        specialty: pick(q.specialty),
        place: q.place,
      ),
      FilterKey.place => CreatorQuery(
        type: q.type,
        specialty: q.specialty,
        place: pick(q.place),
      ),
      FilterKey.unknown => q,
    };
    emit(state.copyWith(query: next));
    return load();
  }

  Future<void> showMore() async {
    final page = state.pagination;
    if (page == null ||
        !page.hasNext ||
        state.status != DirectoryStatus.ready) {
      return;
    }
    final generation = ++_generation;
    emit(state.copyWith(status: DirectoryStatus.loadingMore));
    final result = await _getCreators(_withPage(state.query, page.page + 1));
    if (generation != _generation) return;
    switch (result) {
      case Ok(:final value):
        emit(
          state.copyWith(
            status: DirectoryStatus.ready,
            items: [...state.items, ...value.items],
            filters: value.filters,
            pagination: value.pagination,
          ),
        );
      case Err(:final failure):
        // The cards already shown stay; the person can try "Show more" again.
        emit(state.copyWith(status: DirectoryStatus.ready, failure: failure));
    }
  }

  static CreatorQuery _withPage(CreatorQuery q, int page) => CreatorQuery(
    type: q.type,
    specialty: q.specialty,
    place: q.place,
    page: page,
  );
}
