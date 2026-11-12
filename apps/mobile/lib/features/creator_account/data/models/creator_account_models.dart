import 'package:shoot_mobile/core/media/image_ref.dart';
import 'package:shoot_mobile/core/network/json_read.dart';
import 'package:shoot_mobile/features/creator_account/domain/entities/creator_account.dart';

/// Decoders for the creator account answers (`creator-account.ts`). Each throws
/// [FormatException] on a missing or mistyped field; unknown enum values read as a safe case.

/// `2026-12-14` as a calendar date (no time zone).
DateTime parseDay(String value) {
  final m = RegExp(r'^(\d{4})-(\d{2})-(\d{2})$').firstMatch(value);
  if (m == null) throw FormatException('Expected a date, got "$value"');
  return DateTime(int.parse(m[1]!), int.parse(m[2]!), int.parse(m[3]!));
}

/// A calendar date as the API writes it.
String dayString(DateTime day) =>
    '${day.year.toString().padLeft(4, '0')}-'
    '${day.month.toString().padLeft(2, '0')}-'
    '${day.day.toString().padLeft(2, '0')}';

DateTime? _nullableTime(Json json, String key) {
  final value = readNullableString(json, key);
  return value == null ? null : DateTime.parse(value);
}

LocalText _text(Json json, String key) {
  final o = readObject(json, key);
  return LocalText(en: readString(o, 'en'), ar: readString(o, 'ar'));
}

List<Option> _options(Json json, String key, {bool code = false}) =>
    readList(json, key, (item) {
      final o = asObject(item);
      return Option(
        id: readString(o, code ? 'code' : 'id'),
        name: readString(o, 'name'),
        parents: o.containsKey('professionIds')
            ? readStringList(o, 'professionIds')
            : const [],
      );
    });

BookingRequest _request(Json o) => BookingRequest(
  ref: readString(o, 'ref'),
  quotation: readNullableString(o, 'quotation'),
  occasion: readString(o, 'occasion'),
  emirate: readString(o, 'emirate'),
  date: parseDay(readString(o, 'date')),
  profession: readString(o, 'profession'),
  client: readString(o, 'client'),
  respondBy: _nullableTime(o, 'respondBy'),
  state: readString(o, 'state'),
  answer: RequestAnswer.fromWire(readString(o, 'answer')),
  canDeliver: readBool(o, 'canDeliver'),
  paid: readBool(o, 'paid'),
);

BookingRequest? _nullableRequest(Json json, String key) {
  final o = readNullableObject(json, key);
  return o == null ? null : _request(o);
}

final class MyProfileModel {
  const MyProfileModel._(this._entity);

  factory MyProfileModel.fromJson(Json json) {
    final f = readObject(json, 'fields');
    final identity = readObject(json, 'identity');
    final options = readObject(json, 'options');
    final limits = readObject(json, 'limits');
    IdentityDocument doc(IdentityKind kind) {
      final o = readObject(identity, kind.wire);
      return IdentityDocument(
        state: IdentityState.fromWire(readString(o, 'state')),
        uploadedAt: _nullableTime(o, 'uploadedAt'),
        note: readString(o, 'note'),
      );
    }

    final steps = readList(json, 'steps', (item) {
      final o = asObject(item);
      final key = StepKey.fromWire(readString(o, 'key'));
      if (key == null) throw const FormatException('Unknown step');
      return ProfileStep(
        key: key,
        number: readInt(o, 'number'),
        state: StepState.fromWire(readString(o, 'state')),
        required: readStringList(o, 'required'),
        recommended: readStringList(o, 'recommended'),
      );
    });
    return MyProfileModel._(
      MyProfile(
        code: readString(json, 'code'),
        status: ProfileStatus.fromWire(readString(json, 'status')),
        submittedAt: _nullableTime(json, 'submittedAt'),
        reviewNote: readString(json, 'reviewNote'),
        strength: readInt(json, 'strength'),
        canSubmit: readBool(json, 'canSubmit'),
        hasPendingChanges: readBool(json, 'hasPendingChanges'),
        fields: ProfileFields(
          displayName: _text(f, 'displayName'),
          bio: _text(f, 'bio'),
          gender: Gender.fromWire(readNullableString(f, 'gender')),
          nationality: readNullableString(f, 'nationality'),
          yearsExperience: readNullableInt(f, 'yearsExperience'),
          professions: readStringList(f, 'professions'),
          specialties: readStringList(f, 'specialties'),
          emirates: readStringList(f, 'emirates'),
          languages: readStringList(f, 'languages'),
          social: readList(f, 'social', (item) {
            final o = asObject(item);
            return SocialLink(
              platform: readString(o, 'platform'),
              url: readString(o, 'url'),
            );
          }),
        ),
        photo: ImageRefModel.readNullable(json, 'photo'),
        samples: readList(json, 'samples', (item) {
          final o = asObject(item);
          return ProfileSample(
            id: readString(o, 'id'),
            isVideo: readString(o, 'kind') == 'video',
            image: ImageRefModel.readNullable(o, 'image'),
            videoUrl: readString(o, 'videoUrl'),
            caption: _text(o, 'caption'),
            specialty: readNullableString(o, 'specialty'),
          );
        }),
        identity: {for (final k in IdentityKind.values) k: doc(k)},
        steps: steps,
        options: ProfileOptions(
          professions: _options(options, 'professions'),
          specialties: _options(options, 'specialties'),
          emirates: _options(options, 'emirates'),
          languages: _options(options, 'languages', code: true),
          countries: _options(options, 'countries', code: true),
        ),
        sampleLimit: readInt(limits, 'samples'),
        identityBytes: readInt(limits, 'identityBytes'),
      ),
    );
  }

  final MyProfile _entity;

  MyProfile toEntity() => _entity;
}

final class CreatorBookingsModel {
  const CreatorBookingsModel._(this._entity);

  factory CreatorBookingsModel.fromJson(Json json) {
    List<BookingRequest> list(String key) =>
        readList(json, key, (item) => _request(asObject(item)));
    return CreatorBookingsModel._(
      CreatorBookings(
        updates: readList(json, 'updates', (item) {
          final o = asObject(item);
          return BookingUpdate(
            id: readString(o, 'id'),
            event: readString(o, 'event'),
            ref: readNullableString(o, 'ref'),
            createdAt: DateTime.parse(readString(o, 'createdAt')),
            read: readBool(o, 'read'),
          );
        }),
        waiting: list('waiting'),
        upcoming: list('upcoming'),
        done: list('done'),
      ),
    );
  }

  final CreatorBookings _entity;

  CreatorBookings toEntity() => _entity;
}

final class CreatorAccountModel {
  const CreatorAccountModel._(this._entity);

  factory CreatorAccountModel.fromJson(Json json) {
    final counts = readObject(json, 'counts');
    return CreatorAccountModel._(
      CreatorAccount(
        name: readString(json, 'name'),
        code: readNullableString(json, 'code'),
        professions: readStringList(json, 'professions'),
        status: ProfileStatus.fromWire(readString(json, 'status')),
        strength: readInt(json, 'strength'),
        needs: [
          for (final n in readList(json, 'needs', asObject))
            if (StepKey.fromWire(readString(n, 'step')) case final step?)
              Need(
                step: step,
                required: readStringList(n, 'required'),
                recommended: readStringList(n, 'recommended'),
              ),
        ],
        waiting: _nullableRequest(json, 'waiting'),
        deliverable: _nullableRequest(json, 'deliverable'),
        waitingCount: readInt(counts, 'waiting'),
        upcomingCount: readInt(counts, 'upcoming'),
        blockedDays: readInt(counts, 'blockedDays'),
      ),
    );
  }

  final CreatorAccount _entity;

  CreatorAccount toEntity() => _entity;
}

final class AvailabilityModel {
  const AvailabilityModel._(this._entity);

  factory AvailabilityModel.fromJson(Json json) {
    final days = <DateTime, DayKind>{};
    for (final o in readList(json, 'days', asObject)) {
      days[parseDay(readString(o, 'date'))] = readString(o, 'state') == 'booked'
          ? DayKind.booked
          : DayKind.blocked;
    }
    return AvailabilityModel._(
      Availability(
        today: parseDay(readString(json, 'today')),
        windowDays: readInt(json, 'windowDays'),
        days: days,
        blockedCount: readInt(json, 'blockedCount'),
      ),
    );
  }

  final Availability _entity;

  Availability toEntity() => _entity;
}
