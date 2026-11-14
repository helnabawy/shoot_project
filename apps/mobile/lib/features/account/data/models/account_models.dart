import 'package:shoot_mobile/core/network/json_read.dart';
import 'package:shoot_mobile/features/account/domain/entities/account.dart';

/// The account's answers (`packages/domain/src/api/v1/account.ts`). Each `fromJson` throws
/// [FormatException] on a missing or mistyped field; an unknown enum value reads as the fallback.

BookingStatus _status(String wire) {
  for (final status in BookingStatus.values) {
    if (status.name == wire) return status;
  }
  return BookingStatus.unknown;
}

/// `YYYY-MM-DD` as a calendar date (UTC midnight, never shifted by the device's zone).
DateTime? _day(Json json, String key) {
  final raw = readNullableString(json, key);
  if (raw == null) return null;
  final parsed = DateTime.tryParse(raw);
  if (parsed == null) throw FormatException('Expected a date at "$key"');
  return DateTime.utc(parsed.year, parsed.month, parsed.day);
}

BookingSummary bookingFromJson(Json json) => BookingSummary(
  reference: readString(json, 'reference'),
  status: _status(readString(json, 'status')),
  occasion: readNullableString(json, 'occasion'),
  place: readNullableString(json, 'place'),
  date: _day(json, 'date'),
  startTime: readNullableString(json, 'startTime'),
  professional: readNullableString(json, 'professional'),
  totalFils: readNullableInt(json, 'totalFils'),
);

BriefSummary briefFromJson(Json json) {
  final sent = DateTime.tryParse(readString(json, 'sentAt'));
  if (sent == null) throw const FormatException('Expected a date at "sentAt"');
  return BriefSummary(
    reference: readString(json, 'reference'),
    sentence: readString(json, 'sentence'),
    sentAt: sent,
    status: switch (readString(json, 'status')) {
      'contacted' => BriefStatus.contacted,
      'closed' => BriefStatus.closed,
      _ => BriefStatus.newBrief,
    },
    bookingReference: readNullableString(json, 'bookingReference'),
    saidYes: readNullableInt(json, 'saidYes') ?? 0,
  );
}

UpNext? _upNext(Json? json) {
  if (json == null) return null;
  final kind = readString(json, 'kind');
  return UpNext(
    kind: UpNextKind.values.firstWhere(
      (k) => k.name == kind,
      orElse: () => UpNextKind.unknown,
    ),
    booking: bookingFromJson(readObject(json, 'booking')),
  );
}

FinishItem _finishItem(Object? raw) {
  final json = asObject(raw);
  final key = readString(json, 'key');
  return FinishItem(
    key: FinishKey.values.firstWhere(
      (k) => k.name == key,
      orElse: () => FinishKey.unknown,
    ),
    done: readBool(json, 'done'),
    value: readNullableString(json, 'value'),
  );
}

/// `accountHomeV1`.
final class AccountHomeModel {
  const AccountHomeModel(this._json);

  factory AccountHomeModel.fromJson(Json json) {
    final model = AccountHomeModel(json)..toEntity();
    return model;
  }

  final Json _json;

  AccountHome toEntity() {
    final person = readObject(_json, 'person');
    final places = readObject(_json, 'places');
    final bookings = readObject(places, 'bookings');
    final briefs = readObject(places, 'briefs');
    final finish = readObject(_json, 'finish');
    return AccountHome(
      name: readNullableString(person, 'name'),
      phone: readNullableString(person, 'phone'),
      upNext: _upNext(readNullableObject(_json, 'upNext')),
      bookingsWaiting: readInt(bookings, 'waiting'),
      bookingsOpen: readInt(bookings, 'open'),
      briefsOpen: readInt(briefs, 'open'),
      briefs: readList(_json, 'briefs', (i) => briefFromJson(asObject(i))),
      // An item this build does not know is left out (v1 enums are additive).
      finishItems: [
        for (final item in readList(finish, 'items', _finishItem))
          if (item.key != FinishKey.unknown) item,
      ],
      finishAutoOpen: readBool(finish, 'autoOpen'),
      about: readStringList(_json, 'about'),
    );
  }
}

/// `bookingListV1`.
final class BookingListModel {
  const BookingListModel(this._json);

  factory BookingListModel.fromJson(Json json) {
    final model = BookingListModel(json)..toEntity();
    return model;
  }

  final Json _json;

  BookingList toEntity() => BookingList(
    upcoming: readList(_json, 'upcoming', (i) => bookingFromJson(asObject(i))),
    past: readList(_json, 'past', (i) => bookingFromJson(asObject(i))),
    page: readInt(_json, 'page'),
    hasMore: readBool(_json, 'hasMore'),
  );
}

/// `briefListV1`.
final class BriefListModel {
  const BriefListModel(this._json);

  factory BriefListModel.fromJson(Json json) {
    final model = BriefListModel(json)..toEntity();
    return model;
  }

  final Json _json;

  BriefList toEntity() => BriefList(
    items: readList(_json, 'items', (i) => briefFromJson(asObject(i))),
    page: readInt(_json, 'page'),
    hasMore: readBool(_json, 'hasMore'),
  );
}

/// `meUpdateV1`, the body of `PATCH me`.
final class MeUpdateModel {
  const MeUpdateModel({this.name, this.email, this.finishShown = false});

  factory MeUpdateModel.fromJson(Json json) => MeUpdateModel(
    name: readNullableString(json, 'name'),
    email: readNullableString(json, 'email'),
    finishShown: json['finishShown'] == true,
  );

  final String? name;
  final String? email;
  final bool finishShown;

  Json toJson() => {
    'name': ?name,
    'email': ?email,
    if (finishShown) 'finishShown': true,
  };
}
