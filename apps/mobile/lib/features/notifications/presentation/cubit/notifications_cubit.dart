import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/notifications/domain/entities/notice.dart';
import 'package:shoot_mobile/features/notifications/domain/repositories/notifications_repository.dart';

sealed class NotificationsState extends Equatable {
  const NotificationsState();

  @override
  List<Object?> get props => [];
}

final class NotificationsLoading extends NotificationsState {
  const NotificationsLoading();
}

final class NotificationsFailed extends NotificationsState {
  const NotificationsFailed(this.failure);

  final Failure failure;

  @override
  List<Object?> get props => [failure];
}

final class NotificationsLoaded extends NotificationsState {
  const NotificationsLoaded(this.notices, {this.failure});

  final Notices notices;

  /// A mark-as-read that did not go through; the list stays as it was.
  final Failure? failure;

  List<Notice> get unread => [
    for (final n in notices.items)
      if (!n.read) n,
  ];

  List<Notice> get earlier => [
    for (final n in notices.items)
      if (n.read) n,
  ];

  @override
  List<Object?> get props => [notices, failure];
}

/// Notifications (feature 024): the member's latest notices; opening one marks it read.
class NotificationsCubit extends Cubit<NotificationsState> {
  NotificationsCubit(this._repository) : super(const NotificationsLoading());

  final NotificationsRepository _repository;

  Future<void> load() async {
    emit(const NotificationsLoading());
    switch (await _repository.notices()) {
      case Ok(:final value):
        emit(NotificationsLoaded(value));
      case Err(:final failure):
        emit(NotificationsFailed(failure));
    }
  }

  /// Marks [notice] read (once); a failure keeps the list and shows one line.
  Future<void> markRead(Notice notice) async {
    final s = state;
    if (s is! NotificationsLoaded || notice.read) return;
    switch (await _repository.markRead(notice.id)) {
      case Ok(:final value):
        emit(NotificationsLoaded(value));
      case Err(:final failure):
        emit(NotificationsLoaded(s.notices, failure: failure));
    }
  }
}
