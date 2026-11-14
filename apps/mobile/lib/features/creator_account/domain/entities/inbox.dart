import 'package:equatable/equatable.dart';

/// Feature 019: the creator brief inbox (`/api/mobile/v1/me/creator/briefs`).
///
/// Every word that names a profession, an occasion or a place comes from the API (content); the
/// app holds interface strings only.

enum BriefAnswer {
  accepted,
  rejected;

  static BriefAnswer? fromWire(String? value) => switch (value) {
    'accepted' => accepted,
    'rejected' => rejected,
    _ => null,
  };
}

/// Where an answered brief stands, as the creator may know it.
enum BriefOutcome {
  open,
  otherCreator,
  bookedYou,
  closed;

  static BriefOutcome fromWire(String value) => switch (value) {
    'other-creator' => otherCreator,
    'booked-you' => bookedYou,
    'closed' => closed,
    _ => open,
  };
}

/// One brief for one professional type, without anything that identifies the client.
final class BriefItem extends Equatable {
  const BriefItem({
    required this.ref,
    required this.persona,
    required this.profession,
    required this.occasion,
    required this.sentence,
    required this.emirate,
    required this.date,
    required this.sentAt,
    required this.answer,
    required this.reason,
    required this.outcome,
  });

  final String ref;
  final String persona;
  final String profession;
  final String occasion;
  final String sentence;
  final String emirate;

  /// `null`: the date is to be agreed.
  final DateTime? date;
  final DateTime sentAt;
  final BriefAnswer? answer;
  final String? reason;
  final BriefOutcome outcome;

  /// Answers are per brief and type.
  String get key => '$ref/$persona';

  @override
  List<Object?> get props => [
    ref,
    persona,
    profession,
    occasion,
    sentence,
    emirate,
    date,
    sentAt,
    answer,
    reason,
    outcome,
  ];
}

final class RejectReason extends Equatable {
  const RejectReason({required this.value, required this.label});

  final String value;
  final String label;

  @override
  List<Object?> get props => [value, label];
}

final class CreatorInbox extends Equatable {
  const CreatorInbox({
    required this.open,
    required this.accepted,
    required this.rejected,
    required this.reasons,
  });

  final List<BriefItem> open;
  final List<BriefItem> accepted;
  final List<BriefItem> rejected;
  final List<RejectReason> reasons;

  String? reasonLabel(String? value) {
    for (final r in reasons) {
      if (r.value == value) return r.label;
    }
    return null;
  }

  @override
  List<Object?> get props => [open, accepted, rejected, reasons];
}

/// What Up next leads with: how many open briefs match, and the soonest.
final class BriefsSummary extends Equatable {
  const BriefsSummary({required this.count, required this.soonest});

  final int count;
  final BriefItem? soonest;

  @override
  List<Object?> get props => [count, soonest];
}
