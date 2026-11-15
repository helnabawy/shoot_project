import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/brief/domain/brief_draft.dart' as record;
import 'package:shoot_mobile/features/brief/domain/brief_receipt.dart';
import 'package:shoot_mobile/features/site/domain/entities/brief_builder.dart';

/// Records a "Book with …" brief for the creator with [creatorCode] (011 FR-021) from the answers of
/// screen 17's brief (slot token → value, a multiple slot's values joined by commas).
typedef RecordCreatorBrief = Future<Result<BriefReceipt>> Function(
  BriefBuilderConfig config,
  Map<String, String> values,
  String creatorCode,
);

/// [RecordCreatorBrief] over the app's `POST briefs` client.
RecordCreatorBrief recordCreatorBriefWith(BriefRepository repository) =>
    (config, values, creatorCode) => repository.record(
      config,
      creatorBriefDraft(config, values),
      creator: creatorCode,
    );

/// Screen 17's answers as the landing's draft, the shape `POST briefs` is built from.
record.BriefDraft creatorBriefDraft(
  BriefBuilderConfig config,
  Map<String, String> values,
) {
  final out = <String, List<String>>{};
  String? date;
  for (final slot in config.slots) {
    final value = (values[slot.token] ?? '').trim();
    if (value.isEmpty) continue;
    if (slot.kind == SlotKind.date) {
      date = value;
      continue;
    }
    out[slot.token] = slot.multiple
        ? [
            for (final part in value.split(','))
              if (part.trim().isNotEmpty) part.trim(),
          ]
        : [value];
  }
  return record.BriefDraft(values: out, date: date);
}
