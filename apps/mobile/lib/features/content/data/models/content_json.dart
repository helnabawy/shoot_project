import 'package:shoot_mobile/core/network/json_read.dart';

/// An ISO 8601 date at [key], in UTC. Throws [FormatException] when it is
/// missing or not a date.
DateTime readDate(Json json, String key) {
  final value = readString(json, key);
  final parsed = DateTime.tryParse(value);
  if (parsed == null) {
    throw FormatException('Expected an ISO date at "$key", got "$value"');
  }
  return parsed.toUtc();
}

/// An ISO 8601 date or `null` at [key].
DateTime? readNullableDate(Json json, String key) {
  return json[key] == null ? null : readDate(json, key);
}
