import 'package:equatable/equatable.dart';

/// `bookingStatusV1`; a value this build does not know reads as [unknown] (v1 enums are additive).
enum BookingStatus {
  awaitingAcceptance,
  waitingProfessional,
  awaitingPayment,
  paid,
  scheduled,
  delivered,
  completed,
  cancelled,
  expired,
  onHold,
  declined,
  unknown,
}

enum BriefStatus { newBrief, contacted, closed }

/// What Up next asks of the client (FR-003), most urgent first.
enum UpNextKind { quote, delivery, payment, declined, unknown }

enum FinishKey { number, name, email, unknown }

/// One booking as the client reads it (FR-011). [date] is the shoot day, a calendar date with no
/// time zone; the price is in fils, `null` until priced.
final class BookingSummary extends Equatable {
  const BookingSummary({
    required this.reference,
    required this.status,
    this.occasion,
    this.place,
    this.date,
    this.startTime,
    this.professional,
    this.totalFils,
  });

  final String reference;
  final BookingStatus status;
  final String? occasion;
  final String? place;
  final DateTime? date;
  final String? startTime;
  final String? professional;
  final int? totalFils;

  @override
  List<Object?> get props => [
    reference,
    status,
    occasion,
    place,
    date,
    startTime,
    professional,
    totalFils,
  ];
}

final class BriefSummary extends Equatable {
  const BriefSummary({
    required this.reference,
    required this.sentence,
    required this.sentAt,
    required this.status,
    this.bookingReference,
    this.saidYes = 0,
  });

  final String reference;
  final String sentence;
  final DateTime sentAt;
  final BriefStatus status;
  final String? bookingReference;

  /// 019: creators who said yes to this open brief.
  final int saidYes;

  @override
  List<Object?> get props => [
    reference,
    sentence,
    sentAt,
    status,
    bookingReference,
    saidYes,
  ];
}

final class UpNext extends Equatable {
  const UpNext({required this.kind, required this.booking});

  final UpNextKind kind;
  final BookingSummary booking;

  @override
  List<Object?> get props => [kind, booking];
}

final class FinishItem extends Equatable {
  const FinishItem({required this.key, required this.done, this.value});

  final FinishKey key;
  final bool done;
  final String? value;

  @override
  List<Object?> get props => [key, done, value];
}

/// `accountHomeV1`: everything screen 24 shows, and the server's three checklist items for 25.
final class AccountHome extends Equatable {
  const AccountHome({
    required this.name,
    required this.phone,
    required this.upNext,
    required this.bookingsWaiting,
    required this.bookingsOpen,
    required this.briefsOpen,
    required this.briefs,
    required this.finishItems,
    required this.finishAutoOpen,
    required this.about,
  });

  final String? name;
  final String? phone;
  final UpNext? upNext;
  final int bookingsWaiting;
  final int bookingsOpen;
  final int briefsOpen;
  final List<BriefSummary> briefs;
  final List<FinishItem> finishItems;
  final bool finishAutoOpen;
  final List<String> about;

  FinishItem? item(FinishKey key) {
    for (final item in finishItems) {
      if (item.key == key) return item;
    }
    return null;
  }

  String? get email => item(FinishKey.email)?.value;

  AccountHome copyWith({
    String? name,
    List<FinishItem>? finishItems,
    bool? finishAutoOpen,
  }) => AccountHome(
    name: name ?? this.name,
    phone: phone,
    upNext: upNext,
    bookingsWaiting: bookingsWaiting,
    bookingsOpen: bookingsOpen,
    briefsOpen: briefsOpen,
    briefs: briefs,
    finishItems: finishItems ?? this.finishItems,
    finishAutoOpen: finishAutoOpen ?? this.finishAutoOpen,
    about: about,
  );

  @override
  List<Object?> get props => [
    name,
    phone,
    upNext,
    bookingsWaiting,
    bookingsOpen,
    briefsOpen,
    briefs,
    finishItems,
    finishAutoOpen,
    about,
  ];
}

/// `bookingListV1`: Upcoming comes with page 1, Past is paged.
final class BookingList extends Equatable {
  const BookingList({
    required this.upcoming,
    required this.past,
    required this.page,
    required this.hasMore,
  });

  final List<BookingSummary> upcoming;
  final List<BookingSummary> past;
  final int page;
  final bool hasMore;

  @override
  List<Object?> get props => [upcoming, past, page, hasMore];
}

/// `briefListV1`.
final class BriefList extends Equatable {
  const BriefList({
    required this.items,
    required this.page,
    required this.hasMore,
  });

  final List<BriefSummary> items;
  final int page;
  final bool hasMore;

  @override
  List<Object?> get props => [items, page, hasMore];
}
