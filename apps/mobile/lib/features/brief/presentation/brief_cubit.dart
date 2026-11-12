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
  }) : super(const BriefState());

  final BriefBuilderLoader _loadBuilder;
  final BriefRepository _repository;
  final Clock _clock;

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
              : state.copyWith(load: BriefLoad.ready, config: config),
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
    emit(state.copyWith(draft: draft, active: e.nextStep(draft)?.token));
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
    emit(state.copyWith(draft: draft, active: e.nextStep(draft)?.token));
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
    emit(state.copyWith(submitting: true, message: null, messageToken: null));
    final result = await _repository.record(config, state.draft);
    if (isClosed) return;
    switch (result) {
      case Ok(:final value):
        emit(
          BriefState(
            load: state.load,
            config: config,
            example: false,
            receipt: value,
          ),
        );
      case Err(:final failure):
        emit(_failed(failure));
    }
  }

  BriefState _failed(Failure failure) {
    final base = state.copyWith(submitting: false);
    if (failure is NetworkFailure) {
      return base.copyWith(message: BriefMessage.network);
    }
    if (failure is ServerFailure) {
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
