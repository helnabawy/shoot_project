import 'package:shoot_mobile/core/network/json_read.dart';
import 'package:shoot_mobile/features/creator_account/data/models/creator_account_models.dart';
import 'package:shoot_mobile/features/creator_account/domain/entities/inbox.dart';

/// Decoders for `inbox.ts` (`creatorBriefsV1`, `briefsSummaryV1`). Throw [FormatException] on a
/// missing or mistyped field.

BriefItem briefItemFromJson(Json json) => BriefItem(
  ref: readString(json, 'ref'),
  persona: readString(json, 'persona'),
  profession: readString(json, 'profession'),
  occasion: readString(json, 'occasion'),
  sentence: readString(json, 'sentence'),
  emirate: readString(json, 'emirate'),
  date: switch (readNullableString(json, 'date')) {
    final d? => parseDay(d),
    null => null,
  },
  sentAt: DateTime.parse(readString(json, 'sentAt')),
  answer: BriefAnswer.fromWire(readNullableString(json, 'answer')),
  reason: readNullableString(json, 'reason'),
  outcome: BriefOutcome.fromWire(readString(json, 'outcome')),
  offer: _offerFromJson(json),
);

/// Feature 022 (additive): present only on an offers brief.
BriefOffer? _offerFromJson(Json json) {
  final budget = readNullableInt(json, 'budgetFils');
  if (budget == null) return null;
  final range = readNullableObject(json, 'range');
  final place = readNullableObject(json, 'place');
  return BriefOffer(
    budgetFils: budget,
    minFils: range == null ? 100 : readInt(range, 'minFils'),
    maxFils: range == null ? null : readNullableInt(range, 'maxFils'),
    offerFils: readNullableInt(json, 'offerFils'),
    revisionsLeft: readNullableInt(json, 'revisionsLeft') ?? 3,
    declined: readOptionalBool(json, 'declined'),
    place: place == null
        ? null
        : BriefPlace(
            area: readString(place, 'area'),
            emirate: readString(place, 'emirate'),
            mapUrl: readNullableString(place, 'mapUrl'),
            distanceKm: readNullableInt(place, 'distanceKm'),
          ),
  );
}

final class CreatorInboxModel {
  const CreatorInboxModel._(this._entity);

  factory CreatorInboxModel.fromJson(Json json) => CreatorInboxModel._(
    CreatorInbox(
      open: readList(json, 'open', (o) => briefItemFromJson(asObject(o))),
      accepted: readList(
        json,
        'accepted',
        (o) => briefItemFromJson(asObject(o)),
      ),
      rejected: readList(
        json,
        'rejected',
        (o) => briefItemFromJson(asObject(o)),
      ),
      reasons: readList(json, 'reasons', (o) {
        final r = asObject(o);
        return RejectReason(
          value: readString(r, 'value'),
          label: readString(r, 'label'),
        );
      }),
    ),
  );

  final CreatorInbox _entity;

  CreatorInbox toEntity() => _entity;
}

/// The optional `briefs` of `creatorAccountV1`; `null` when absent (profile not live).
BriefsSummary? briefsSummaryFromJson(Json account) {
  final json = readNullableObject(account, 'briefs');
  if (json == null) return null;
  final soonest = readNullableObject(json, 'soonest');
  return BriefsSummary(
    count: readInt(json, 'count'),
    soonest: soonest == null
        ? null
        : BriefItem(
            ref: readString(soonest, 'ref'),
            persona: '',
            profession: readString(soonest, 'profession'),
            occasion: readString(soonest, 'occasion'),
            sentence: '',
            emirate: readString(soonest, 'emirate'),
            date: switch (readNullableString(soonest, 'date')) {
              final d? => parseDay(d),
              null => null,
            },
            sentAt: DateTime.fromMillisecondsSinceEpoch(0, isUtc: true),
            answer: null,
            reason: null,
            outcome: BriefOutcome.open,
          ),
  );
}
