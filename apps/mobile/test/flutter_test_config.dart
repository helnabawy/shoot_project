import 'dart:async';
import 'dart:io';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

/// Runs before every test file (feature 007, research R7).
///
/// Loads the vendored Roboto and Noto Sans Arabic so text is drawn with the same glyphs as the
/// board references, instead of flutter_test's box font. Shadows and the fixed clock are set per
/// golden test in `helpers/golden.dart`, because the test binding resets `debugDisableShadows`
/// for every test.
Future<void> testExecutable(FutureOr<void> Function() testMain) async {
  TestWidgetsFlutterBinding.ensureInitialized();
  await loadTestFonts();
  await testMain();
}

Future<void> loadTestFonts() async {
  final families = {'Roboto': <String>[], 'Noto Sans Arabic': <String>[]};
  for (final file in Directory('test/fonts').listSync().whereType<File>()) {
    final name = file.uri.pathSegments.last;
    if (!name.endsWith('.ttf')) continue;
    families[name.startsWith('Roboto') ? 'Roboto' : 'Noto Sans Arabic']!.add(
      file.path,
    );
  }
  for (final MapEntry(key: family, value: paths) in families.entries) {
    final loader = FontLoader(family);
    for (final path in paths) {
      loader.addFont(
        Future.value(ByteData.sublistView(File(path).readAsBytesSync())),
      );
    }
    await loader.load();
  }
}
