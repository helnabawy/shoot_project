import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/quick_match/domain/entities/quick_match.dart';
import 'package:shoot_mobile/features/quick_match/domain/repositories/quick_match_repository.dart';

enum BookingViewStatus { loading, ready, notFound, failed }

final class BookingViewState extends Equatable {
  const BookingViewState({
    this.status = BookingViewStatus.loading,
    this.view,
    this.busy = false,
    this.commandFailure,
    this.fresh,
  });

  final BookingViewStatus status;
  final BookingView? view;

  /// A command is on its way (the primary action shows its spinner; a second tap does nothing).
  final bool busy;

  /// The last refused command, shown as one line (`booking.errors.*` code in the failure).
  final Failure? commandFailure;

  /// Set when "Get a fresh quotation" has the brief's link: the screen opens step 2 with it.
  final FreshQuotation? fresh;

  BookingViewState copyWith({
    BookingViewStatus? status,
    BookingView? view,
    bool? busy,
    Failure? Function()? commandFailure,
    FreshQuotation? Function()? fresh,
  }) => BookingViewState(
    status: status ?? this.status,
    view: view ?? this.view,
    busy: busy ?? this.busy,
    commandFailure: commandFailure == null
        ? this.commandFailure
        : commandFailure(),
    fresh: fresh == null ? this.fresh : fresh(),
  );

  @override
  List<Object?> get props => [status, view, busy, commandFailure, fresh];
}

/// Screens 12, 13, 14, 40 and the states without a board (feature 012 US3 to US5). The state is
/// read from the server each time the screen opens or is refreshed (FR-030); a command answers
/// with the booking as it stands, so the screen never guesses.
final class BookingViewCubit extends Cubit<BookingViewState> {
  BookingViewCubit({
    required this._repository,
    required this.ref,
    required this.key,
  }) : super(const BookingViewState());

  final QuickMatchRepository _repository;
  final String ref;
  final String key;

  Future<void> load() async {
    // A refresh keeps what is on screen; only the first load shows the spinner.
    if (state.view == null) {
      emit(state.copyWith(status: BookingViewStatus.loading));
    }
    _apply(await _repository.getBooking(ref, key));
  }

  Future<void> accept() => _command(() => _repository.accept(ref, key));

  Future<void> confirmDelivery() =>
      _command(() => _repository.confirmDelivery(ref, key));

  Future<void> report(String reason) =>
      _command(() => _repository.report(ref, key, reason));

  Future<void> pickAnother(String persona, String code) =>
      _command(() => _repository.pickAnother(ref, key, persona, code));

  /// "Get a fresh quotation": the brief's link and the old picks, for step 2.
  Future<void> getFresh() async {
    if (state.busy) return;
    emit(state.copyWith(busy: true, commandFailure: () => null));
    final result = await _repository.fresh(ref, key);
    if (isClosed) return;
    switch (result) {
      case Ok(:final value):
        emit(state.copyWith(busy: false, fresh: () => value));
      case Err(:final failure):
        emit(state.copyWith(busy: false, commandFailure: () => failure));
    }
  }

  Future<void> _command(Future<Result<BookingView>> Function() run) async {
    if (state.busy) return;
    emit(state.copyWith(busy: true, commandFailure: () => null));
    final result = await run();
    if (isClosed) return;
    switch (result) {
      case Ok(:final value):
        emit(
          state.copyWith(
            status: BookingViewStatus.ready,
            view: value,
            busy: false,
          ),
        );
      case Err(:final failure):
        emit(state.copyWith(busy: false, commandFailure: () => failure));
        // A change someone else made (a refusal from state) shows the state as it stands.
        if (failure is ServerFailure && failure.statusCode == 409) await load();
    }
  }

  void _apply(Result<BookingView> result) {
    if (isClosed) return;
    switch (result) {
      case Ok(:final value):
        emit(state.copyWith(status: BookingViewStatus.ready, view: value));
      case Err(:final failure):
        emit(
          state.copyWith(
            status: failure is NotFoundFailure
                ? BookingViewStatus.notFound
                : BookingViewStatus.failed,
            commandFailure: () => failure,
          ),
        );
    }
  }
}
