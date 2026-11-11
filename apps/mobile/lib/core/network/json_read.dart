/// Typed readers for API JSON. Every model's `fromJson` uses them, so a
/// missing or mistyped field fails the same way everywhere: a
/// [FormatException] naming the field, which repositories map to a
/// `ServerFailure`. Unknown keys are never read, so additive changes to v1
/// decode unchanged.
library;

typedef Json = Map<String, Object?>;

Never _bad(String key, String expected, Object? value) {
  throw FormatException(
    'Expected $expected at "$key", got ${value?.runtimeType ?? 'nothing'}',
  );
}

String readString(Json json, String key) {
  final value = json[key];
  return value is String ? value : _bad(key, 'a string', value);
}

/// A string or `null`. An absent key also reads as `null`.
String? readNullableString(Json json, String key) {
  final value = json[key];
  if (value == null || value is String) return value as String?;
  _bad(key, 'a string or null', value);
}

/// An integer. A whole double (`400.0`) is accepted.
int readInt(Json json, String key) {
  final value = json[key];
  if (value is int) return value;
  if (value is double && value == value.truncateToDouble()) {
    return value.toInt();
  }
  _bad(key, 'an integer', value);
}

bool readBool(Json json, String key) {
  final value = json[key];
  return value is bool ? value : _bad(key, 'a boolean', value);
}

/// A list, each item mapped by [item] (use [asObject] for object items).
List<T> readList<T>(Json json, String key, T Function(Object? item) item) {
  final value = json[key];
  if (value is! List) _bad(key, 'a list', value);
  return [for (final element in value) item(element)];
}

Json readObject(Json json, String key) {
  final value = json[key];
  return value is Map
      ? value.cast<String, Object?>()
      : _bad(key, 'an object', value);
}

/// An object or `null` (an image with no usable file maps to `null`). An
/// absent key also reads as `null`.
Json? readNullableObject(Json json, String key) {
  final value = json[key];
  if (value == null) return null;
  return value is Map
      ? value.cast<String, Object?>()
      : _bad(key, 'an object or null', value);
}

/// A list item that must be an object.
Json asObject(Object? value) {
  return value is Map
      ? value.cast<String, Object?>()
      : _bad('item', 'an object', value);
}

/// A string enum. A value this build does not know maps to [fallback] (the
/// enum's `unknown` case), so a new server value never breaks decoding.
T readEnum<T extends Enum>(Json json, String key, List<T> values, T fallback) {
  final name = readString(json, key);
  for (final value in values) {
    if (value.name == name) return value;
  }
  return fallback;
}
