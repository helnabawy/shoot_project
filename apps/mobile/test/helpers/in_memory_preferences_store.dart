import 'package:shoot_mobile/core/preferences/preferences_store.dart';

/// A [PreferencesStore] over a seeded map, for cubit and app tests.
///
/// [failReads] makes every read return nothing (an unreadable store);
/// [failWrites] makes writes complete without storing (a full disk). [writes]
/// logs every successful `writeString` / `remove` as `(key, value)`, with a
/// `null` value for a removal, so tests can assert what was saved.
class InMemoryPreferencesStore implements PreferencesStore {
  InMemoryPreferencesStore([Map<String, String>? seed]) : values = {...?seed};

  final Map<String, String> values;
  final List<(String, String?)> writes = [];

  bool failReads = false;
  bool failWrites = false;

  @override
  String? readString(String key) => failReads ? null : values[key];

  @override
  Future<void> writeString(String key, String value) async {
    if (failWrites) return;
    values[key] = value;
    writes.add((key, value));
  }

  @override
  Future<void> remove(String key) async {
    if (failWrites) return;
    values.remove(key);
    writes.add((key, null));
  }
}
