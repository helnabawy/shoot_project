import 'package:equatable/equatable.dart';
import 'package:shoot_mobile/core/content/creator_card.dart';
import 'package:shoot_mobile/core/media/image_ref.dart';

/// One piece of work on a step-2 card (`matchCreatorV1.gallery`); a play mark on a video.
final class WorkThumb extends Equatable {
  const WorkThumb({required this.isVideo, required this.thumb});

  final bool isVideo;
  final ImageRef thumb;

  @override
  List<Object?> get props => [isVideo, thumb];
}

/// A creator on step 2: the directory card and up to three pieces of work.
final class MatchCreator extends Equatable {
  const MatchCreator({required this.card, required this.gallery});

  final CreatorCard card;
  final List<WorkThumb> gallery;

  String get code => card.code;

  /// The first name, for "Continue with Omar".
  String get firstName => card.name.split(' ').first;

  @override
  List<Object?> get props => [card, gallery];
}

/// A professional type in a brief, in CMS words (never from ARB, persona-extensibility).
final class MatchPersona extends Equatable {
  const MatchPersona({
    required this.slug,
    required this.singular,
    required this.plural,
  });

  final String slug;
  final String singular;
  final String plural;

  @override
  List<Object?> get props => [slug, singular, plural];
}

/// The creators free for one professional type, at one fixed price.
final class MatchSection extends Equatable {
  const MatchSection({
    required this.persona,
    required this.priceFils,
    required this.includes,
    required this.creators,
  });

  final MatchPersona persona;

  /// Whole fils; `null` is "price on request".
  final int? priceFils;
  final List<String> includes;
  final List<MatchCreator> creators;

  @override
  List<Object?> get props => [persona, priceFils, includes, creators];
}

/// Another day with someone free (screen 08).
final class NearbyDay extends Equatable {
  const NearbyDay({required this.date, required this.free});

  /// `YYYY-MM-DD`.
  final String date;
  final int free;

  @override
  List<Object?> get props => [date, free];
}

/// Step 2 (`matchV1`).
final class MatchPage extends Equatable {
  const MatchPage({
    required this.reference,
    required this.sentence,
    required this.briefDate,
    required this.duration,
    required this.date,
    required this.priceOnRequest,
    required this.totalFils,
    required this.sections,
    required this.nearby,
  });

  final String reference;
  final String sentence;
  final String? briefDate;
  final String? duration;

  /// The day shown; `null` is "any date".
  final String? date;
  final bool priceOnRequest;
  final int? totalFils;
  final List<MatchSection> sections;
  final List<NearbyDay> nearby;

  /// Nobody is free in at least one type (screen 08).
  bool get noneFree => sections.any((s) => s.creators.isEmpty);

  @override
  List<Object?> get props => [
    reference,
    sentence,
    briefDate,
    duration,
    date,
    priceOnRequest,
    totalFils,
    sections,
    nearby,
  ];
}

/// A choice for one professional type; `code == null` is "let us pick".
final class Pick extends Equatable {
  const Pick({required this.persona, required this.code});

  final String persona;
  final String? code;

  @override
  List<Object?> get props => [persona, code];
}

/// Screen 09's details (`detailsV1`).
final class BookingDetails extends Equatable {
  const BookingDetails({
    required this.date,
    required this.startTime,
    required this.duration,
    required this.venue,
    this.note = '',
  });

  final String date;
  final String startTime;
  final String duration;
  final String venue;
  final String note;

  @override
  List<Object?> get props => [date, startTime, duration, venue, note];
}

/// A quotation just saved (`quotationIssuedV1`): the private link and WhatsApp's address.
final class QuotationIssued extends Equatable {
  const QuotationIssued({
    required this.reference,
    required this.key,
    required this.whatsappUrl,
  });

  final String reference;
  final String key;
  final String? whatsappUrl;

  @override
  List<Object?> get props => [reference, key, whatsappUrl];
}

/// `bookingViewV1.state`. A value this build does not know reads as [unknown].
enum BookingState {
  quoted,
  accepted,
  confirmed,
  paid,
  scheduled,
  delivered,
  completed,
  cancelled,
  expired,
  onHold,
  unknown;

  static BookingState fromWire(String value) => switch (value) {
    'quoted' => quoted,
    'accepted' => accepted,
    'confirmed' => confirmed,
    'paid' => paid,
    'scheduled' => scheduled,
    'delivered' => delivered,
    'completed' => completed,
    'cancelled' => cancelled,
    'expired' => expired,
    'on-hold' => onHold,
    _ => unknown,
  };
}

/// `bookingViewV1.nextStep`.
enum NextStep {
  accept,
  waitProfessional,
  chooseAnother,
  pay,
  shootDay,
  confirmDelivery,
  freshQuotation,
  contactTeam,
  none;

  static NextStep fromWire(String value) {
    for (final step in values) {
      if (step.name == value) return step;
    }
    return none;
  }
}

/// `bookingViewV1.progress[].key`.
enum ProgressKey {
  briefSent,
  confirmed,
  paid,
  shootDay,
  delivered,
  completed;

  static ProgressKey? fromWire(String value) {
    for (final key in values) {
      if (key.name == value) return key;
    }
    return null;
  }
}

final class ProgressStep extends Equatable {
  const ProgressStep({required this.key, required this.at});

  final ProgressKey key;
  final DateTime? at;

  @override
  List<Object?> get props => [key, at];
}

final class BookingLine extends Equatable {
  const BookingLine({
    required this.kind,
    required this.label,
    required this.amountFils,
    required this.includes,
  });

  final String kind;
  final String label;
  final int amountFils;
  final List<String> includes;

  @override
  List<Object?> get props => [kind, label, amountFils, includes];
}

final class Professional extends Equatable {
  const Professional({
    required this.type,
    required this.name,
    required this.code,
  });

  final String type;

  /// `null` while the team is choosing.
  final String? name;
  final String? code;

  @override
  List<Object?> get props => [type, name, code];
}

/// Free creators to replace one who declined or did not answer.
final class Replacement extends Equatable {
  const Replacement({required this.persona, required this.creators});

  final MatchPersona persona;
  final List<CreatorCard> creators;

  @override
  List<Object?> get props => [persona, creators];
}

/// The booking behind a private link (`bookingViewV1`).
final class BookingView extends Equatable {
  const BookingView({
    required this.reference,
    required this.state,
    required this.nextStep,
    required this.sentence,
    required this.issuedAt,
    required this.validUntil,
    required this.shootDate,
    required this.startTime,
    required this.totalFils,
    required this.lines,
    required this.professionals,
    required this.progress,
    required this.canAccept,
    required this.canConfirmDelivery,
    required this.canReport,
    required this.replacements,
    required this.holdReason,
    required this.whatsappUrl,
  });

  final String reference;
  final BookingState state;
  final NextStep nextStep;
  final String sentence;
  final DateTime issuedAt;
  final DateTime validUntil;
  final String? shootDate;
  final String? startTime;
  final int totalFils;
  final List<BookingLine> lines;
  final List<Professional> professionals;
  final List<ProgressStep> progress;
  final bool canAccept;
  final bool canConfirmDelivery;
  final bool canReport;
  final List<Replacement> replacements;
  final String? holdReason;
  final String? whatsappUrl;

  @override
  List<Object?> get props => [
    reference,
    state,
    nextStep,
    sentence,
    issuedAt,
    validUntil,
    shootDate,
    startTime,
    totalFils,
    lines,
    professionals,
    progress,
    canAccept,
    canConfirmDelivery,
    canReport,
    replacements,
    holdReason,
    whatsappUrl,
  ];
}

/// Where "Get a fresh quotation" starts again (`freshQuotationV1`).
final class FreshQuotation extends Equatable {
  const FreshQuotation({
    required this.briefReference,
    required this.briefKey,
    required this.picks,
  });

  final String briefReference;
  final String briefKey;
  final List<Pick> picks;

  @override
  List<Object?> get props => [briefReference, briefKey, picks];
}
