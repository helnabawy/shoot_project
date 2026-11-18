import 'package:shoot_mobile/core/media/image_ref.dart';
import 'package:shoot_mobile/core/network/json_read.dart';
import 'package:shoot_mobile/features/creator_home/domain/entities/creator_home.dart';

/// `creatorHomeV1` (`GET /me/creator/home`). Decodes strictly what it shows; an item whose `kind` this
/// build does not know is left out, and an unknown `mode` reads as incomplete (contracts/mobile-api.md).
final class CreatorHomeModel {
  const CreatorHomeModel(this.entity);

  factory CreatorHomeModel.fromJson(Json json) {
    final counts = readNullableObject(json, 'counts');
    final next = readNullableObject(json, 'next');
    return CreatorHomeModel(
      CreatorHome(
        name: readString(json, 'name'),
        code: readNullableString(json, 'code'),
        professions: readStringList(json, 'professions'),
        photo: ImageRefModel.readNullable(json, 'photo'),
        mode: readEnum(json, 'mode', HomeMode.values, HomeMode.incomplete),
        needs: readOptionalList(json, 'needs', (n) {
          final need = asObject(n);
          return HomeNeed(
            step: readString(need, 'step'),
            required: readStringList(need, 'required').isNotEmpty,
          );
        }),
        counts: counts == null
            ? null
            : HomeCounts(
                toAnswer: readInt(counts, 'toAnswer'),
                comingUp: readInt(counts, 'comingUp'),
                completed: readInt(counts, 'completed'),
              ),
        queue: [
          for (final raw in readList(json, 'queue', (i) => i))
            ?_item(asObject(raw)),
        ],
        next: next == null
            ? null
            : HomeNext(
                ref: readString(next, 'ref'),
                occasion: readString(next, 'occasion'),
                emirate: readString(next, 'emirate'),
                date: readString(next, 'date'),
                time: readNullableString(next, 'time'),
                length: readNullableString(next, 'length'),
                paid: readBool(next, 'paid'),
              ),
        today: readEnum(json, 'today', TodayState.values, TodayState.free),
        reasons: readOptionalList(json, 'reasons', (r) {
          final reason = asObject(r);
          return DeclineReason(
            value: readString(reason, 'value'),
            label: readString(reason, 'label'),
          );
        }),
      ),
    );
  }

  final CreatorHome entity;

  CreatorHome toEntity() => entity;

  static HomeItem? _item(Json json) {
    final kind = readString(json, 'kind');
    final ref = readString(json, 'ref');
    final occasion = readString(json, 'occasion');
    final emirate = readString(json, 'emirate');
    final profession = readString(json, 'profession');
    final date = readNullableString(json, 'date');
    return switch (kind) {
      'booking' => HomeBooking(
        ref: ref,
        occasion: occasion,
        emirate: emirate,
        profession: profession,
        date: date,
        time: readNullableString(json, 'time'),
        length: readNullableString(json, 'length'),
        client: readString(json, 'client'),
        respondBy: DateTime.parse(readString(json, 'respondBy')),
      ),
      'brief' => HomeBrief(
        ref: ref,
        occasion: occasion,
        emirate: emirate,
        profession: profession,
        date: date,
        persona: readString(json, 'persona'),
        sentAt: DateTime.parse(readString(json, 'sentAt')),
        budgetFils: readNullableInt(json, 'budgetFils'),
      ),
      _ => null,
    };
  }
}
