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
    this.paying = false,
    this.notPaidYet = false,
  });

  final BookingViewStatus status;
  final BookingView? view;

  /// A command is on its way (the primary action shows its spinner; a second tap does nothing).
  final bool busy;

  /// The last refused command, shown as one line (`booking.errors.*` code in the failure).
  final Failure? commandFailure;

  /// Set when "Get a fresh quotation" has the brief's link: the screen opens step 2 with it.
  final FreshQuotation? fresh;

  /// Feature 020: the secure payment page was opened; back in the app the booking is read again until
  /// it is paid ("Payment received, we're confirming it").
  final bool paying;

  /// Back from the payment page, the booking is still waiting for payment (left the page, or slow).
  final bool notPaidYet;

  BookingViewState copyWith({
    BookingViewStatus? status,
    BookingView? view,
    bool? busy,
    Failure? Function()? commandFailure,
    FreshQuotation? Function()? fresh,
    bool? paying,
    bool? notPaidYet,
  }) => BookingViewState(
    status: status ?? this.status,
    view: view ?? this.view,
    busy: busy ?? this.busy,
    commandFailure: commandFailure == null
        ? this.commandFailure
        : commandFailure(),
    fresh: fresh == null ? this.fresh : fresh(),
    paying: paying ?? this.paying,
    notPaidYet: notPaidYet ?? this.notPaidYet,
  );

  @override
  List<Object?> get props => [
    status,
    view,
    busy,
    commandFailure,
    fresh,
    paying,
    notPaidYet,
  ];
}

/// Screens 12, 13, 14, 40 and the states without a board (feature 012 US3 to US5). The state is
/// read from the server each time the screen opens or is refreshed (FR-030); a command answers
/// with the booking as it stands, so the screen never guesses.
final class BookingViewCubit extends Cubit<BookingViewState> {
  BookingViewCubit({
    required this._repository,
    required this.ref,
    required this.key,
    this.pollEvery = const Duration(seconds: 3),
    this.pollTimes = 20,
  }) : super(const BookingViewState());

  final QuickMatchRepository _repository;
  final String ref;
  final String key;

  /// Back from the payment page: how often, and how many times, the booking is read again (R7).
  final Duration pollEvery;
  final int pollTimes;

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

  /// Feature 020: opens the secure payment page with [open]. The server decides the amount.
  Future<void> pay(Future<void> Function(Uri url) open) async {
    if (state.busy) return;
    emit(
      state.copyWith(busy: true, commandFailure: () => null, notPaidYet: false),
    );
    final result = await _repository.pay(ref, key);
    if (isClosed) return;
    switch (result) {
      case Ok(:final value):
        emit(state.copyWith(busy: false, paying: true));
        await open(Uri.parse(value));
      case Err(:final failure):
        emit(state.copyWith(busy: false, commandFailure: () => failure));
        if (failure is ServerFailure && failure.statusCode == 409) await load();
    }
  }

  /// The app came back to the foreground: read the booking again, and after a payment keep reading
  /// it for a short while until the provider's confirmation has made it paid.
  Future<void> resumed() async {
    await load();
    if (!state.paying) return;
    for (var i = 0; i < pollTimes && _awaitingPayment; i++) {
      await Future<void>.delayed(pollEvery);
      if (isClosed) return;
      await load();
    }
    if (isClosed) return;
    emit(state.copyWith(paying: false, notPaidYet: _awaitingPayment));
  }

  bool get _awaitingPayment => state.view?.state == BookingState.confirmed;

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
