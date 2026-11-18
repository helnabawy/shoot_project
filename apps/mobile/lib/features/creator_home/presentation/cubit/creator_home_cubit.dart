import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/creator_home/domain/entities/creator_home.dart';
import 'package:shoot_mobile/features/creator_home/domain/repositories/creator_home_repository.dart';

sealed class CreatorHomeState extends Equatable {
  const CreatorHomeState();

  @override
  List<Object?> get props => [];
}

final class CreatorHomeLoading extends CreatorHomeState {
  const CreatorHomeLoading();
}

final class CreatorHomeFailed extends CreatorHomeState {
  const CreatorHomeFailed(this.failure);

  final Failure failure;

  @override
  List<Object?> get props => [failure];
}

/// What the screen says after an answer that did not go through (FR-019, FR-020).
enum HomeNotice {
  /// The request is no longer open; nothing was recorded and the queue has moved on.
  closed,

  /// The answer could not be sent; the request stays the card and can be answered again.
  notSent,
}

final class CreatorHomeLoaded extends CreatorHomeState {
  const CreatorHomeLoaded(this.home, {this.answering, this.notice});

  final CreatorHome home;

  /// The key of the request being answered; its buttons wait.
  final String? answering;
  final HomeNotice? notice;

  @override
  List<Object?> get props => [home, answering, notice];
}

/// The creator home (screens 64, 65 and 67): reads the home, and answers its card with the same
/// commands the creator's bookings page and inbox use, reading the home again afterwards.
class CreatorHomeCubit extends Cubit<CreatorHomeState> {
  CreatorHomeCubit(this._repository) : super(const CreatorHomeLoading());

  final CreatorHomeRepository _repository;

  /// The first read, and "Try again".
  Future<void> load() async {
    emit(const CreatorHomeLoading());
    await _read();
  }

  /// A read that leaves what is shown in place until the new answer arrives (pull to refresh, coming
  /// back to the app, a push for a new request).
  Future<void> refresh() async {
    final current = state;
    if (current is! CreatorHomeLoaded) return load();
    await _read(keep: current);
  }

  Future<void> _read({CreatorHomeLoaded? keep, HomeNotice? notice}) async {
    switch (await _repository.home()) {
      case Ok(:final value):
        emit(CreatorHomeLoaded(value, notice: notice));
      case Err(:final failure):
        // A failed refresh keeps the screen the creator is looking at.
        if (keep == null) emit(CreatorHomeFailed(failure));
    }
  }

  Future<void> accept(HomeItem item) => _answer(
    item,
    () => switch (item) {
      HomeBooking() => _repository.answerBooking(item.ref, confirm: true),
      HomeBrief(:final persona) => _repository.answerBrief(
        item.ref,
        persona: persona,
        accept: true,
      ),
    },
  );

  /// [reason] and [note] are the optional ones the Decline step collects; a booking has a reason only.
  Future<void> decline(HomeItem item, {String? reason, String? note}) =>
      _answer(
        item,
        () => switch (item) {
          HomeBooking() => _repository.answerBooking(
            item.ref,
            confirm: false,
            reason: reason,
          ),
          HomeBrief(:final persona) => _repository.answerBrief(
            item.ref,
            persona: persona,
            accept: false,
            reason: reason,
            note: note,
          ),
        },
      );

  Future<void> _answer(
    HomeItem item,
    Future<Result<void>> Function() send,
  ) async {
    final current = state;
    if (current is! CreatorHomeLoaded || current.answering != null) return;
    emit(CreatorHomeLoaded(current.home, answering: item.key));
    switch (await send()) {
      case Ok():
        await _read(keep: current);
      case Err(:final failure):
        if (_isClosed(failure)) {
          // Nothing was recorded: show the queue as it is now, with the plain message.
          await _read(keep: current, notice: HomeNotice.closed);
          // A failed read still ends the wait, with the message.
          if (state is CreatorHomeLoaded &&
              (state as CreatorHomeLoaded).answering != null) {
            emit(CreatorHomeLoaded(current.home, notice: HomeNotice.closed));
          }
        } else {
          emit(CreatorHomeLoaded(current.home, notice: HomeNotice.notSent));
        }
    }
  }

  /// "No longer open": the request was taken, withdrawn or expired, or it is not this creator's.
  static bool _isClosed(Failure failure) =>
      failure is ServerFailure &&
      const {403, 404, 409}.contains(failure.statusCode);
}
