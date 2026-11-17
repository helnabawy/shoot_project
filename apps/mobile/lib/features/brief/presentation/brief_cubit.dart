import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/time/clock.dart';
import 'package:shoot_mobile/features/brief/domain/brief_draft.dart';
import 'package:shoot_mobile/features/brief/domain/brief_receipt.dart';
import 'package:shoot_mobile/features/site/domain/entities/brief_builder.dart';

/// A one-line message the bar shows; the words live in ARB.
enum BriefMessage {
  missingStep,
  pastDate,
  optionGone,
  rateLimited,
  network,
  generic,

  /// 022: a price outside the allowed range.
  budgetRange,
}

enum BriefLoad { idle, loading, ready, off, failed }

const _unset = Object();

final class BriefState extends Equatable {
  const BriefState({
    this.load = BriefLoad.idle,
    this.config,
    this.draft = const BriefDraft(),
    this.example = true,
    this.active,
    this.message,
    this.messageToken,
    this.submitting = false,
    this.receipt,
    this.signInRequired = false,
    this.signInNeeded = false,
    this.awaitingSignIn = false,
    this.offersEnabled = false,
    this.prices = const [],
    this.budgets = const {},
  });

  final BriefLoad load;
  final BriefBuilderConfig? config;
  final BriefDraft draft;

  /// True until the bar is first touched: the example sentence plays (never answers).
  final bool example;

  /// The slot whose list is showing, or `null` when the bar shows only its sentence.
  final String? active;
  final BriefMessage? message;
  final String? messageToken;
  final bool submitting;

  /// Set once after a brief was recorded; the landing reads it, then calls `acknowledge`.
  final BriefReceipt? receipt;

  /// 021: sending needs a signed-in member (the owner's switch, from `GET brief-builder`).
  final bool signInRequired;

  /// 021: set once when a signed-out person sends; the landing opens sign-in, then calls
  /// `signInOpened`.
  final bool signInNeeded;

  /// 021: the brief waits for sign-in; `/brief/send` sends it once the person is in.
  final bool awaitingSignIn;

  /// 022: "Creators offer prices" is on; a complete brief asks for the client's price.
  final bool offersEnabled;

  /// 022: the usual price and range per type, once the brief is complete (the price step shows).
  final List<BriefPrice> prices;

  /// 022: the client's price per type (persona slug → fils).
  final Map<String, int> budgets;

  BriefState copyWith({
    BriefLoad? load,
    BriefBuilderConfig? config,
    BriefDraft? draft,
    bool? example,
    Object? active = _unset,
    Object? message = _unset,
    Object? messageToken = _unset,
    bool? submitting,
    Object? receipt = _unset,
    bool? signInRequired,
    bool? signInNeeded,
    bool? awaitingSignIn,
    bool? offersEnabled,
    List<BriefPrice>? prices,
    Map<String, int>? budgets,
  }) => BriefState(
    load: load ?? this.load,
    config: config ?? this.config,
    draft: draft ?? this.draft,
    example: example ?? this.example,
    active: identical(active, _unset) ? this.active : active as String?,
    message: identical(message, _unset)
        ? this.message
        : message as BriefMessage?,
    messageToken: identical(messageToken, _unset)
        ? this.messageToken
        : messageToken as String?,
    submitting: submitting ?? this.submitting,
    receipt: identical(receipt, _unset)
        ? this.receipt
        : receipt as BriefReceipt?,
    signInRequired: signInRequired ?? this.signInRequired,
    signInNeeded: signInNeeded ?? this.signInNeeded,
    awaitingSignIn: awaitingSignIn ?? this.awaitingSignIn,
    offersEnabled: offersEnabled ?? this.offersEnabled,
    prices: prices ?? this.prices,
    budgets: budgets ?? this.budgets,
  );

  @override
  List<Object?> get props => [
    load,
    config,
    draft,
    example,
    active,
    message,
    messageToken,
    submitting,
    receipt,
    signInRequired,
    signInNeeded,
    awaitingSignIn,
    offersEnabled,
    prices,
    budgets,
  ];
}

typedef BriefBuilderLoader = Future<Result<BriefBuilder>> Function();

/// The brief of the landing (001 FR-046 to FR-068, spec FR-012 to FR-018). One instance for the
/// whole app run, so a half-built brief survives leaving the landing and coming back and is lost
/// when the app closes (spec edge case). It holds no copy: every word comes from the CMS config.
class BriefCubit extends Cubit<BriefState> {
  BriefCubit({
    required this._loadBuilder,
    required this._repository,
    required this._clock,
    bool Function()? isSignedIn,
  }) : _isSignedIn = isSignedIn ?? _alwaysSignedIn,
       super(const BriefState());

  final BriefBuilderLoader _loadBuilder;
  final BriefRepository _repository;
  final Clock _clock;

  /// 021: whether a member is signed in now (the session). Without it the gate never applies.
  final bool Function() _isSignedIn;

  static bool _alwaysSignedIn() => true;

  BriefEngine? get engine {
    final config = state.config;
    return config == null ? null : BriefEngine(config);
  }

  /// Reads the builder (again after a language change). The draft is kept: it holds option values,
  /// not words.
  Future<void> load() async {
    emit(state.copyWith(load: BriefLoad.loading));
    final result = await _loadBuilder();
    if (isClosed) return;
    switch (result) {
      case Ok(:final value):
        final config = value.builder;
        emit(
          config == null || !_hasOptions(config)
              ? state.copyWith(load: BriefLoad.off)
              : state.copyWith(
                  load: BriefLoad.ready,
                  config: config,
                  signInRequired: value.signInRequired,
                  offersEnabled: value.offersEnabled,
                ),
        );
      case Err():
        emit(state.copyWith(load: BriefLoad.failed));
    }
  }

  bool _hasOptions(BriefBuilderConfig c) =>
      c.slots.any((s) => s.kind == SlotKind.persona && s.options.isNotEmpty);

  /// The first touch ends the example and opens the first unanswered step (FR-014).
  void touch() {
    final e = engine;
    if (e == null) return;
    emit(
      state.copyWith(
        example: false,
        active: e.nextStep(state.draft)?.token,
        message: null,
        messageToken: null,
      ),
    );
  }

  /// "Start a brief" from the menu, the closing section or the learning steps (FR-024, FR-040).
  void openFirstUnanswered() {
    final e = engine;
    if (e == null) return;
    final slot = e.firstMissing(state.draft) ?? e.nextStep(state.draft);
    emit(
      state.copyWith(
        example: false,
        active: slot?.token,
        message: null,
        messageToken: null,
      ),
    );
  }

  /// An occasion tile: chooses [value] in the first options slot that offers it, then shows the
  /// next unanswered step; with no such option the brief just opens (research R3).
  void startWithOption(String value) {
    final e = engine;
    if (e == null) return;
    BuilderSlot? target;
    for (final s in e.slots) {
      if (s.kind == SlotKind.options &&
          s.options.any((o) => o.value == value)) {
        target = s;
        break;
      }
    }
    if (target == null) return openFirstUnanswered();
    final change = e.choose(state.draft, target.token, value);
    emit(
      state.copyWith(
        draft: change.draft,
        example: false,
        active: e.nextStep(change.draft)?.token,
        message: null,
        messageToken: null,
      ),
    );
  }

  void choose(String token, String value) {
    final e = engine;
    if (e == null) return;
    final change = e.choose(state.draft, token, value);
    final multiple = e.slot(token)?.multiple ?? false;
    emit(
      state.copyWith(
        draft: change.draft,
        example: false,
        // A cleared earlier answer takes the person back to that step (FR-012, scenario S4).
        active: change.cleared.isNotEmpty
            ? change.cleared.first
            : multiple
            ? token
            : e.nextStep(change.draft)?.token,
        message: null,
        messageToken: null,
      ),
    );
  }

  /// "Continue" in a multiple-choice step.
  void continueStep() {
    final e = engine;
    if (e == null) return;
    emit(state.copyWith(active: e.nextStep(state.draft)?.token, message: null));
  }

  void skip(String token) {
    final e = engine;
    if (e == null) return;
    final draft = e.skip(state.draft, token);
    emit(
      state.copyWith(
        draft: draft,
        active: e.nextStep(draft)?.token,
        prices: const [],
        budgets: const {},
      ),
    );
  }

  void setDate(String? iso) {
    final e = engine;
    if (e == null) return;
    final change = e.setDate(state.draft, iso, _clock.now());
    if (change.dateRefused) {
      return emit(
        state.copyWith(
          message: BriefMessage.pastDate,
          messageToken: _dateToken(e),
        ),
      );
    }
    emit(
      state.copyWith(
        draft: change.draft,
        active: e.nextStep(change.draft)?.token,
        message: null,
        messageToken: null,
      ),
    );
  }

  String? _dateToken(BriefEngine e) {
    for (final s in e.slots) {
      if (s.kind == SlotKind.date) return s.token;
    }
    return null;
  }

  /// Tapping a printed word reopens its step with the current choice still set (FR-012).
  void reopen(String token) =>
      emit(state.copyWith(example: false, active: token, message: null));

  void takeBack() {
    final e = engine;
    if (e == null) return;
    final draft = e.takeBack(state.draft);
    emit(
      state.copyWith(
        draft: draft,
        active: e.nextStep(draft)?.token,
        prices: const [],
        budgets: const {},
      ),
    );
  }

  /// The one primary action (FR-016): an incomplete brief opens its first missing step with a
  /// one-line message and records nothing; a complete one is recorded.
  Future<void> submit() async {
    final e = engine;
    final config = state.config;
    if (e == null || config == null || state.submitting) return;
    final missing = e.firstMissing(state.draft);
    if (missing != null) {
      return emit(
        state.copyWith(
          example: false,
          active: missing.token,
          message: BriefMessage.missingStep,
          messageToken: missing.token,
        ),
      );
    }
    // 022 (US1): with offers on, a complete brief first shows the price step; the next tap sends it.
    if (state.offersEnabled && state.prices.isEmpty) return _loadPrices(config);
    // 021 (BS-US4-S1): signed out while sending needs sign-in: keep the draft, ask for sign-in.
    if (state.signInRequired && !_isSignedIn()) return _askSignIn();
    emit(state.copyWith(submitting: true, message: null, messageToken: null));
    final result = await _repository.record(
      config,
      state.draft,
      budgets: state.offersEnabled ? state.budgets : null,
    );
    if (isClosed) return;
    switch (result) {
      case Ok(:final value):
        emit(
          BriefState(
            load: state.load,
            config: config,
            example: false,
            receipt: value,
            signInRequired: state.signInRequired,
          ),
        );
      case Err(:final failure):
        emit(_failed(failure));
    }
  }

  Future<void> _loadPrices(BriefBuilderConfig config) async {
    emit(state.copyWith(submitting: true, message: null, messageToken: null));
    final result = await _repository.prices(config, state.draft);
    if (isClosed) return;
    switch (result) {
      case Ok(:final value) when value.isNotEmpty:
        emit(
          state.copyWith(
            submitting: false,
            active: null,
            prices: value,
            budgets: {
              for (final p in value)
                if (p.suggestedFils != null) p.persona: p.suggestedFils!,
            },
          ),
        );
      case Ok():
        // No price step from the server (offers turned off meanwhile): send as before.
        emit(state.copyWith(submitting: false, offersEnabled: false));
        await submit();
      case Err(:final failure):
        emit(_failed(failure));
    }
  }

  /// 022: the client's price for one type, kept within its range (whole AED).
  void setBudget(String persona, int fils) {
    final price = state.prices.where((p) => p.persona == persona).firstOrNull;
    if (price == null) return;
    emit(
      state.copyWith(
        budgets: {...state.budgets, persona: price.clamp(fils)},
        message: null,
      ),
    );
  }

  void _askSignIn() => emit(
    state.copyWith(
      example: false,
      submitting: false,
      signInRequired: true,
      signInNeeded: true,
      awaitingSignIn: true,
      message: null,
      messageToken: null,
    ),
  );

  /// The landing has opened the sign-in screens.
  void signInOpened() => emit(state.copyWith(signInNeeded: false));

  /// `/brief/send` (021, BS-US4-S2): the person signed in from the brief; the kept draft is sent
  /// once. A visit without a waiting brief, or still signed out, does nothing.
  Future<void> sendAfterSignIn() async {
    if (!state.awaitingSignIn || state.submitting || !_isSignedIn()) return;
    emit(state.copyWith(awaitingSignIn: false, signInNeeded: false));
    await submit();
  }

  BriefState _failed(Failure failure) {
    final base = state.copyWith(submitting: false);
    if (failure is NetworkFailure) {
      return base.copyWith(message: BriefMessage.network);
    }
    if (failure is ServerFailure) {
      if (failure.code == 'brief.errors.signInRequired') {
        // The switch was turned on after the builder loaded: ask for sign-in (BS-US5-S4).
        return base.copyWith(
          signInRequired: true,
          signInNeeded: true,
          awaitingSignIn: true,
        );
      }
      if (failure.code == 'brief.errors.budgetRange') {
        return base.copyWith(message: BriefMessage.budgetRange);
      }
      if (failure.statusCode == 429 || failure.code == 'brief.errors.tooMany') {
        return base.copyWith(message: BriefMessage.rateLimited);
      }
      if (failure.code == 'brief.errors.optionGone') {
        final path = failure.fields.isEmpty ? null : failure.fields.first.path;
        final token = path?.split('.').last;
        return base.copyWith(
          message: BriefMessage.optionGone,
          messageToken: token,
          active: token,
        );
      }
    }
    return base.copyWith(message: BriefMessage.generic);
  }

  /// The landing has taken the receipt; the brief starts empty.
  void acknowledge() => emit(state.copyWith(receipt: null));
}
