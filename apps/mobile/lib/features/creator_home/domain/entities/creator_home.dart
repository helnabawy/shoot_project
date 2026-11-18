import 'package:equatable/equatable.dart';
import 'package:shoot_mobile/core/media/image_ref.dart';

/// Which home a creator sees (feature 023): from their profile's status.
enum HomeMode { live, incomplete, review, paused }

/// Today, in the Availability row.
enum TodayState { free, blocked, booked }

/// One request to answer. The queue is ordered by the server: booking requests by answer-by time,
/// then briefs newest first.
sealed class HomeItem extends Equatable {
  const HomeItem({
    required this.ref,
    required this.occasion,
    required this.emirate,
    required this.profession,
    required this.date,
  });

  final String ref;

  /// Content words in the request language; the title is "{occasion} in {emirate}".
  final String occasion;
  final String emirate;
  final String profession;

  /// `YYYY-MM-DD`; `null`: the date is to be agreed.
  final String? date;

  /// The key the Decline step and the answering state use.
  String get key;
}

/// A booking request waiting for this creator; the client is a first name and an initial only.
final class HomeBooking extends HomeItem {
  const HomeBooking({
    required super.ref,
    required super.occasion,
    required super.emirate,
    required super.profession,
    required super.date,
    required this.time,
    required this.length,
    required this.client,
    required this.respondBy,
  });

  /// "HH:MM", when known.
  final String? time;
  final String? length;
  final String client;
  final DateTime respondBy;

  @override
  String get key => ref;

  @override
  List<Object?> get props => [
    ref,
    occasion,
    emirate,
    profession,
    date,
    time,
    length,
    client,
    respondBy,
  ];
}

/// An open client brief that matches this creator.
final class HomeBrief extends HomeItem {
  const HomeBrief({
    required super.ref,
    required super.occasion,
    required super.emirate,
    required super.profession,
    required super.date,
    required this.persona,
    required this.sentAt,
    this.budgetFils,
  });

  /// The professional type the answer is for.
  final String persona;
  final DateTime sentAt;

  /// 022: the client's price, whole fils, only when creators offer prices.
  final int? budgetFils;

  @override
  String get key => '$ref:$persona';

  @override
  List<Object?> get props => [
    ref,
    occasion,
    emirate,
    profession,
    date,
    persona,
    sentAt,
    budgetFils,
  ];
}

final class HomeCounts extends Equatable {
  const HomeCounts({
    required this.toAnswer,
    required this.comingUp,
    required this.completed,
  });

  final int toAnswer;
  final int comingUp;
  final int completed;

  @override
  List<Object?> get props => [toAnswer, comingUp, completed];
}

/// The nearest confirmed booking.
final class HomeNext extends Equatable {
  const HomeNext({
    required this.ref,
    required this.occasion,
    required this.emirate,
    required this.date,
    required this.time,
    required this.length,
    required this.paid,
  });

  final String ref;
  final String occasion;
  final String emirate;
  final String date;
  final String? time;
  final String? length;
  final bool paid;

  @override
  List<Object?> get props => [ref, occasion, emirate, date, time, length, paid];
}

/// A profile step that is still missing something.
final class HomeNeed extends Equatable {
  const HomeNeed({required this.step, required this.required});

  final String step;

  /// `true`: something required is missing; `false`: only something recommended.
  final bool required;

  @override
  List<Object?> get props => [step, required];
}

/// A reason a brief can be declined with, from the content area.
final class DeclineReason extends Equatable {
  const DeclineReason({required this.value, required this.label});

  final String value;
  final String label;

  @override
  List<Object?> get props => [value, label];
}

final class CreatorHome extends Equatable {
  const CreatorHome({
    required this.name,
    required this.code,
    required this.professions,
    required this.photo,
    required this.mode,
    required this.needs,
    required this.counts,
    required this.queue,
    required this.next,
    required this.today,
    required this.reasons,
  });

  final String name;
  final String? code;
  final List<String> professions;
  final ImageRef? photo;
  final HomeMode mode;
  final List<HomeNeed> needs;

  /// Only when [mode] is live.
  final HomeCounts? counts;
  final List<HomeItem> queue;
  final HomeNext? next;
  final TodayState today;
  final List<DeclineReason> reasons;

  @override
  List<Object?> get props => [
    name,
    code,
    professions,
    photo,
    mode,
    needs,
    counts,
    queue,
    next,
    today,
    reasons,
  ];
}
