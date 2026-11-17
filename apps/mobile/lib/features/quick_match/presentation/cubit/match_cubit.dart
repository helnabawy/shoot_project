import 'dart:async';

import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/network/stamp_poller.dart';
import 'package:shoot_mobile/core/push/push_service.dart';
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
    this.moved,
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

  /// 022 (board 48): the first name of a creator whose offer moved while the client was on the details step.
  final String? moved;

  /// 022 (board 49): the chosen offers plus the fee, when every type has one; `null` otherwise.
  int? get offersTotalFils {
    final p = page;
    if (p == null || !p.offersMode) return null;
    var sum = 0;
    for (var i = 0; i < p.sections.length; i++) {
      final offer = _offerIn(p.sections[i], chosenIn(i));
      if (offer == null) return null;
      sum += offer.totalFils;
    }
    return sum;
  }

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
        Pick(
          persona: p.sections[i].persona.slug,
          code: chosenIn(i)?.code,
          expectFils: _offerIn(p.sections[i], chosenIn(i))?.amountFils,
        ),
    ];
  }

  static MatchOffer? _offerIn(MatchSection section, MatchCreator? creator) {
    if (creator == null) return null;
    for (final o in section.offers ?? const <MatchOffer>[]) {
      if (o.creator.code == creator.code) return o;
    }
    return null;
  }

  MatchState copyWith({
    MatchStatus? status,
    MatchPage? page,
    Map<String, int>? chosen,
    Set<String>? letUsPick,
    String? Function()? date,
    String? Function()? duration,
    Failure? Function()? failure,
    String? Function()? moved,
  }) => MatchState(
    status: status ?? this.status,
    page: page ?? this.page,
    chosen: chosen ?? this.chosen,
    letUsPick: letUsPick ?? this.letUsPick,
    date: date == null ? this.date : date(),
    duration: duration == null ? this.duration : duration(),
    failure: failure == null ? this.failure : failure(),
    moved: moved == null ? this.moved : moved(),
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
    moved,
  ];
}

final class MatchCubit extends Cubit<MatchState> {
  MatchCubit({
    required this._repository,
    required this.ref,
    required this.key,
    Stream<PushEvent>? pushEvents,
  }) : super(const MatchState()) {
    _poller = StampPoller(
      read: () async => switch (await _repository.matchStamp(ref, key)) {
        Ok(:final value) => value,
        Err() => null,
      },
      onChanged: refresh,
    );
    // 022 (FR-024): a new or changed offer for this brief reloads at once.
    _push = pushEvents
        ?.where(
          (e) => e.event == 'offer-new' && e.path.contains('/match/$ref/'),
        )
        .listen((_) => refresh());
  }

  final QuickMatchRepository _repository;
  final String ref;
  final String key;
  late final StampPoller _poller;
  StreamSubscription<PushEvent>? _push;

  /// 022: keeps the offers list live while it is open (FR-023); a no-op in the fixed flow.
  void startLive() {
    if (state.page?.offersMode ?? false) _poller.start();
  }

  void stopLive() => _poller.stop();

  /// Reloads quietly, keeping the choices; the list stays on screen.
  Future<void> refresh() async {
    final result = await _repository.getMatch(
      ref,
      key,
      date: state.date,
      duration: state.duration,
    );
    if (isClosed) return;
    if (result case Ok(:final value)) {
      emit(state.copyWith(page: value));
      _applyWanted();
    }
  }

  /// 022 (board 48): reloads step 2 after a quotation was refused because an offer moved, and notes
  /// whose price changed from the amounts the client saw ([seen], the picks with `expectFils`).
  Future<void> reloadAfterMove(List<Pick> seen) async {
    await load();
    if (isClosed) return;
    String? who;
    for (final pick in seen) {
      final expect = pick.expectFils;
      if (expect == null || pick.code == null) continue;
      for (final section in state.page?.sections ?? const <MatchSection>[]) {
        if (section.persona.slug != pick.persona) continue;
        for (final offer in section.offers ?? const <MatchOffer>[]) {
          if (offer.creator.code == pick.code && offer.amountFils != expect) {
            who ??= offer.creator.firstName;
          }
        }
      }
    }
    emit(state.copyWith(moved: () => who));
  }

  /// The notice was read.
  void dismissMoved() => emit(state.copyWith(moved: () => null));

  /// 022 (US4-S5): declines one offer; the list answers again without it.
  Future<void> decline(int section, int index) async {
    final page = state.page;
    final offers = page?.sections[section].offers;
    if (page == null || offers == null || index >= offers.length) return;
    final slug = page.sections[section].persona.slug;
    final result = await _repository.declineOffer(
      ref,
      key,
      persona: slug,
      creator: offers[index].creator.code,
    );
    if (isClosed) return;
    switch (result) {
      case Ok(:final value):
        emit(
          state.copyWith(page: value, chosen: {...state.chosen}..remove(slug)),
        );
      case Err(:final failure):
        emit(state.copyWith(failure: () => failure));
    }
  }

  @override
  Future<void> close() async {
    _poller.stop();
    await _push?.cancel();
    return super.close();
  }

  /// Creators asked for by the link (`?pick=`, 011 FR-021): chosen when their card is listed.
  List<Pick> _wanted = const [];

  /// Chooses the creators of [picks] once step 2 has them (now, or when it loads).
  void preselect(List<Pick> picks) {
    _wanted = picks;
    _applyWanted();
  }

  void _applyWanted() {
    final page = state.page;
    if (page == null || _wanted.isEmpty) return;
    final chosen = {...state.chosen};
    final letUsPick = {...state.letUsPick};
    for (final pick in _wanted) {
      final section = page.sections.where(
        (s) => s.persona.slug == pick.persona,
      );
      if (section.isEmpty) continue;
      if (pick.code == null) {
        letUsPick.add(pick.persona);
        continue;
      }
      final index = section.first.creators.indexWhere(
        (c) => c.code == pick.code,
      );
      if (index >= 0) {
        chosen[pick.persona] = index;
        letUsPick.remove(pick.persona);
      }
    }
    emit(state.copyWith(chosen: chosen, letUsPick: letUsPick));
  }

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
        _applyWanted();
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
