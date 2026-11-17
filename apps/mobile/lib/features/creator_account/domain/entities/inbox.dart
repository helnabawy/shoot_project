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
    this.offer,
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

  /// Feature 022: the client's price and this creator's offer, on an offers brief; `null` otherwise.
  final BriefOffer? offer;

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
    offer,
  ];
}

/// Feature 022: what an offers brief adds to a creator's item. Amounts are fils; never the service fee
/// (the creator sees only their own amount) and never the client's pin (the area only).
final class BriefOffer extends Equatable {
  const BriefOffer({
    required this.budgetFils,
    required this.minFils,
    required this.maxFils,
    required this.offerFils,
    required this.revisionsLeft,
    required this.declined,
    this.place,
  });

  /// The client's price for this type.
  final int budgetFils;
  final int minFils;

  /// `null`: no ceiling (no usual price).
  final int? maxFils;

  /// This creator's current offer, or `null` before they answer.
  final int? offerFils;
  final int revisionsLeft;

  /// The client declined this creator's offer (final).
  final bool declined;
  final BriefPlace? place;

  bool allows(int fils) =>
      fils >= minFils &&
      (maxFils == null || fils <= maxFils!) &&
      fils % 100 == 0;

  @override
  List<Object?> get props => [
    budgetFils,
    minFils,
    maxFils,
    offerFils,
    revisionsLeft,
    declined,
    place,
  ];
}

/// The area a creator may see before a booking: never the pin.
final class BriefPlace extends Equatable {
  const BriefPlace({
    required this.area,
    required this.emirate,
    this.mapUrl,
    this.distanceKm,
  });

  final String area;
  final String emirate;
  final String? mapUrl;
  final int? distanceKm;

  @override
  List<Object?> get props => [area, emirate, mapUrl, distanceKm];
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
