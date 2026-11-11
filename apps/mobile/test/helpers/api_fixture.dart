import 'dart:convert';
import 'dart:io';

/// Reads an API v1 example as decoded JSON.
///
/// Until 008's web and app branches merge, the examples are local stand-ins in
/// `test/fixtures/api/v1/`. After the merge this reads the shared set in
/// `packages/domain/src/api/v1/examples/` (one fixture set for both sides).
Map<String, Object?> apiFixture(String name) {
  final file = File('test/fixtures/api/v1/$name.json');
  return (jsonDecode(file.readAsStringSync()) as Map).cast<String, Object?>();
}
