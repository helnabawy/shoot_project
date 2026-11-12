import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/quick_match/domain/entities/quick_match.dart';
import 'package:shoot_mobile/features/quick_match/domain/repositories/quick_match_repository.dart';

enum MatchStatus { loading, ready, notFound, failed }

/// Screens 07 and 08 (feature 012 US1). One chosen creator per professional type; the first is
/// chosen to start with, as on the board. A person who is "not sure" lets the team pick.
final class MatchState extends Equatable {
  const MatchState({
    this.status = MatchStatus.loading,
    this.page,
    this.chosen = const {},
    this.letUsPick = const {},
    this.date,
    this.duration,
    this.failure,
  });

  final MatchStatus status;
  final MatchPage? page;

  /// Professional type slug → index of the chosen card.
  final Map<String, int> chosen;
  final Set<String> letUsPick;

  /// A day picked on screen 08 (overrides the brief's).
  final String? date;

  /// A duration picked on screen 09 (overrides the brief's).
  final String? duration;
  final Failure? failure;

  /// The chosen creator of section [index], or `null` for "let us pick" or nobody free.
  MatchCreator? chosenIn(int index) {
    final section = page?.sections[index];
    if (section == null || section.creators.isEmpty) return null;
    if (letUsPick.contains(section.persona.slug)) return null;
    final at = chosen[section.persona.slug] ?? 0;
    return section.creators[at.clamp(0, section.creators.length - 1)];
  }

  /// Every type's pick, or `null` while someone is not free (screen 08).
  List<Pick>? get picks {
    final p = page;
    if (p == null || p.noneFree) return null;
    return [
      for (var i = 0; i < p.sections.length; i++)
        Pick(persona: p.sections[i].persona.slug, code: chosenIn(i)?.code),
    ];
  }

  MatchState copyWith({
    MatchStatus? status,
    MatchPage? page,
    Map<String, int>? chosen,
    Set<String>? letUsPick,
    String? Function()? date,
    String? Function()? duration,
    Failure? Function()? failure,
  }) => MatchState(
    status: status ?? this.status,
    page: page ?? this.page,
    chosen: chosen ?? this.chosen,
    letUsPick: letUsPick ?? this.letUsPick,
    date: date == null ? this.date : date(),
    duration: duration == null ? this.duration : duration(),
    failure: failure == null ? this.failure : failure(),
  );

  @override
  List<Object?> get props => [
    status,
    page,
    chosen,
    letUsPick,
    date,
    duration,
    failure,
  ];
}

final class MatchCubit extends Cubit<MatchState> {
  MatchCubit({required this._repository, required this.ref, required this.key})
    : super(const MatchState());

  final QuickMatchRepository _repository;
  final String ref;
  final String key;

  Future<void> load() async {
    emit(state.copyWith(status: MatchStatus.loading, failure: () => null));
    final result = await _repository.getMatch(
      ref,
      key,
      date: state.date,
      duration: state.duration,
    );
    if (isClosed) return;
    switch (result) {
      case Ok(:final value):
        emit(state.copyWith(status: MatchStatus.ready, page: value));
      case Err(:final failure):
        emit(
          state.copyWith(
            status: failure is NotFoundFailure
                ? MatchStatus.notFound
                : MatchStatus.failed,
            failure: () => failure,
          ),
        );
    }
  }

  /// A swipe or a tap on a card: that creator is chosen (and "let us pick" is undone).
  void choose(int section, int index) {
    final page = state.page;
    if (page == null) return;
    final slug = page.sections[section].persona.slug;
    emit(
      state.copyWith(
        chosen: {...state.chosen, slug: index},
        letUsPick: {...state.letUsPick}..remove(slug),
      ),
    );
  }

  /// "Not sure? Let us pick" for every type.
  void letTeamPick() {
    final page = state.page;
    if (page == null) return;
    emit(
      state.copyWith(
        letUsPick: {for (final s in page.sections) s.persona.slug},
      ),
    );
  }

  /// Screen 08: another day changes only the date, and step 2 opens for it.
  Future<void> changeDay(String date) {
    emit(
      state.copyWith(date: () => date, chosen: const {}, letUsPick: const {}),
    );
    return load();
  }

  /// Screen 09: another duration reprices the same brief (the answer's price follows).
  Future<void> changeDuration(String duration) {
    emit(state.copyWith(duration: () => duration));
    return load();
  }
}
