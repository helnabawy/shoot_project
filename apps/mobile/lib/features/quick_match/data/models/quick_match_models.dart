import 'package:shoot_mobile/core/content/creator_card.dart';
import 'package:shoot_mobile/core/media/image_ref.dart';
import 'package:shoot_mobile/core/network/json_read.dart';
import 'package:shoot_mobile/features/quick_match/domain/entities/quick_match.dart';

/// Decoders for the booking endpoints (feature 012, contracts/booking-api.md). Each throws
/// [FormatException] on a missing or mistyped field; unknown keys are never read.

MatchPersona _persona(Json json) => MatchPersona(
  slug: readString(json, 'slug'),
  singular: readString(json, 'singular'),
  plural: readString(json, 'plural'),
);

MatchCreator _creator(Json json) => MatchCreator(
  card: CreatorCardModel.fromJson(json).toEntity(),
  gallery: List.unmodifiable(
    readList(json, 'gallery', (item) {
      final row = asObject(item);
      return WorkThumb(
        isVideo: readString(row, 'kind') == 'video',
        thumb: ImageRefModel.read(row, 'thumb'),
      );
    }),
  ),
);

Pick _pick(Json json) => Pick(
  persona: readString(json, 'persona'),
  code: readNullableString(json, 'code'),
);

/// `matchV1`.
final class MatchPageModel {
  const MatchPageModel._(this._entity);

  factory MatchPageModel.fromJson(Json json) {
    final brief = readObject(json, 'brief');
    return MatchPageModel._(
      MatchPage(
        reference: readString(brief, 'reference'),
        sentence: readString(brief, 'sentence'),
        briefDate: readNullableString(brief, 'date'),
        duration: readNullableString(brief, 'duration'),
        date: readNullableString(json, 'date'),
        priceOnRequest: readBool(json, 'priceOnRequest'),
        totalFils: readNullableInt(json, 'totalFils'),
        sections: List.unmodifiable(
          readList(json, 'sections', (item) {
            final s = asObject(item);
            return MatchSection(
              persona: _persona(readObject(s, 'persona')),
              priceFils: readNullableInt(s, 'priceFils'),
              includes: List.unmodifiable(readStringList(s, 'includes')),
              creators: List.unmodifiable(readList(s, 'creators', (c) => _creator(asObject(c)))),
            );
          }),
        ),
        nearby: List.unmodifiable(
          readList(json, 'nearby', (item) {
            final n = asObject(item);
            return NearbyDay(
              date: readString(n, 'date'),
              free: readInt(n, 'free'),
            );
          }),
        ),
      ),
    );
  }

  final MatchPage _entity;

  MatchPage toEntity() => _entity;
}

/// `quotationIssuedV1`.
final class QuotationIssuedModel {
  const QuotationIssuedModel._(this._entity);

  factory QuotationIssuedModel.fromJson(Json json) => QuotationIssuedModel._(
    QuotationIssued(
      reference: readString(json, 'reference'),
      key: readString(json, 'key'),
      whatsappUrl: readNullableString(json, 'whatsappUrl'),
    ),
  );

  final QuotationIssued _entity;

  QuotationIssued toEntity() => _entity;
}

/// `bookingViewV1`.
final class BookingViewModel {
  const BookingViewModel._(this._entity);

  factory BookingViewModel.fromJson(Json json) {
    return BookingViewModel._(
      BookingView(
        reference: readString(json, 'reference'),
        state: BookingState.fromWire(readString(json, 'state')),
        nextStep: NextStep.fromWire(readString(json, 'nextStep')),
        sentence: readString(json, 'sentence'),
        issuedAt: DateTime.parse(readString(json, 'issuedAt')),
        validUntil: DateTime.parse(readString(json, 'validUntil')),
        shootDate: readNullableString(json, 'shootDate'),
        startTime: readNullableString(json, 'startTime'),
        totalFils: readInt(json, 'totalFils'),
        lines: List.unmodifiable(
          readList(json, 'lines', (item) {
            final l = asObject(item);
            return BookingLine(
              kind: readString(l, 'kind'),
              label: readString(l, 'label'),
              amountFils: readInt(l, 'amountFils'),
              includes: List.unmodifiable(readStringList(l, 'includes')),
            );
          }),
        ),
        professionals: List.unmodifiable(
          readList(json, 'professionals', (item) {
            final p = asObject(item);
            return Professional(
              type: readString(p, 'type'),
              name: readNullableString(p, 'name'),
              code: readNullableString(p, 'code'),
            );
          }),
        ),
        progress: List.unmodifiable([
          for (final item in readList(json, 'progress', asObject))
            if (ProgressKey.fromWire(readString(item, 'key')) case final key?)
              ProgressStep(
                key: key,
                at: readNullableString(item, 'at') == null
                    ? null
                    : DateTime.parse(readString(item, 'at')),
              ),
        ]),
        canAccept: readBool(json, 'canAccept'),
        canConfirmDelivery: readBool(json, 'canConfirmDelivery'),
        canReport: readBool(json, 'canReport'),
        replacements: List.unmodifiable(
          readList(json, 'replacements', (item) {
            final r = asObject(item);
            return Replacement(
              persona: MatchPersona(
                slug: readString(readObject(r, 'persona'), 'slug'),
                singular: readString(readObject(r, 'persona'), 'singular'),
                plural: readString(readObject(r, 'persona'), 'singular'),
              ),
              creators: List.unmodifiable(
                readList(r, 'creators', (c) => CreatorCardModel.fromJson(asObject(c)).toEntity()),
              ),
            );
          }),
        ),
        holdReason: readNullableString(json, 'holdReason'),
        whatsappUrl: readNullableString(json, 'whatsappUrl'),
      ),
    );
  }

  final BookingView _entity;

  BookingView toEntity() => _entity;
}

/// `freshQuotationV1`.
final class FreshQuotationModel {
  const FreshQuotationModel._(this._entity);

  factory FreshQuotationModel.fromJson(Json json) => FreshQuotationModel._(
    FreshQuotation(
      briefReference: readString(json, 'briefReference'),
      briefKey: readString(json, 'briefKey'),
      picks: List.unmodifiable(readList(json, 'picks', (p) => _pick(asObject(p)))),
    ),
  );

  final FreshQuotation _entity;

  FreshQuotation toEntity() => _entity;
}

/// The body of `POST match/{ref}/{key}/quotation` (`quotationRequestV1`).
Json quotationRequestJson(List<Pick> picks, BookingDetails details) => {
  'picks': [
    for (final p in picks) {'persona': p.persona, 'code': p.code},
  ],
  'details': {
    'date': details.date,
    'startTime': details.startTime,
    'duration': details.duration,
    'venue': details.venue,
    if (details.note.trim().isNotEmpty) 'note': details.note.trim(),
  },
};
