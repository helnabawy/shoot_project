import 'dart:convert';
import 'dart:io';

/// The contract examples shared with the server (feature 008, research R11):
/// `packages/domain/src/api/v1/examples/` relative to `apps/mobile`, where
/// `flutter test` runs.
const apiExamplesDir = '../../packages/domain/src/api/v1/examples';

/// Reads `<name>.json` from the examples folder and returns the decoded value
/// (a map for an endpoint answer, a list for some files).
///
/// A missing file fails with its name and path, so a renamed example is easy
/// to find.
Object? loadExampleValue(String name) {
  final file = File('$apiExamplesDir/$name.json');
  if (!file.existsSync()) {
    throw StateError(
      'API example "$name" not found at ${file.absolute.path}',
    );
  }
  return jsonDecode(file.readAsStringSync());
}

/// Reads `<name>.json` from the examples folder as a JSON object.
Map<String, dynamic> loadExample(String name) {
  final value = loadExampleValue(name);
  if (value is! Map<String, dynamic>) {
    throw StateError('API example "$name" is not a JSON object');
  }
  return value;
}

/// The names (without `.json`) of every example file, sorted.
List<String> exampleNames() {
  final dir = Directory(apiExamplesDir);
  return dir
      .listSync()
      .whereType<File>()
      .map((f) => f.uri.pathSegments.last)
      .where((n) => n.endsWith('.json'))
      .map((n) => n.substring(0, n.length - '.json'.length))
      .toList()
    ..sort();
}
