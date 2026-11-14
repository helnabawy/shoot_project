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
);

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
