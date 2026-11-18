import 'package:equatable/equatable.dart';

/// Who a notice was written for.
enum NoticeAudience { client, creator, unknown }

/// One of the member's in-app notices (feature 024). The app words it from [event].
final class Notice extends Equatable {
  const Notice({
    required this.id,
    required this.event,
    required this.audience,
    required this.createdAt,
    required this.read,
    this.ref,
    this.path,
  });

  final String id;
  final String event;
  final NoticeAudience audience;

  /// The booking's or the brief's reference.
  final String? ref;

  /// Where it leads on the site (and in the app), without a language prefix.
  final String? path;
  final DateTime createdAt;
  final bool read;

  /// A brief or an offer rather than a booking.
  bool get aboutBrief => event.startsWith('brief') || event.startsWith('offer');

  @override
  List<Object?> get props => [id, event, audience, ref, path, createdAt, read];
}

/// The latest notices, newest first, and how many are unread.
final class Notices extends Equatable {
  const Notices({required this.items, required this.unread});

  final List<Notice> items;
  final int unread;

  @override
  List<Object?> get props => [items, unread];
}
