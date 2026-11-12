import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

import '../../helpers/api_examples.dart';

/// The Arabic board strings (`specs/design-system/canvas/strings.ar/<board>.json`, feature 007
/// research R6) say what the app says: each English text node of a board maps to Arabic that
/// the app's `app_ar.arb` (or the shared examples, for CMS text) uses in the same place as the
/// English in `app_en.arb`. So the derived Arabic references and the app's Arabic goldens show
/// the same words.
void main() {
  const dir = '../../specs/design-system/canvas/strings.ar';
  Map<String, Object?> json(String path) =>
      (jsonDecode(File(path).readAsStringSync()) as Map)
          .cast<String, Object?>();

  final en = json('lib/core/l10n/arb/app_en.arb');
  final ar = json('lib/core/l10n/arb/app_ar.arb');

  // CMS text and the sentences the app builds from it (the role rows on board 21).
  String names(String example, {required bool lower, required String or}) {
    final personas = (loadExample(example)['personas']! as List)
        .cast<Map<String, Object?>>()
        .map((p) => p['singular']! as String)
        .map((s) => lower ? s.toLowerCase() : s)
        .toList();
    final last = personas.removeLast();
    return or
        .replaceAll('{first}', personas.join(en['listSeparator']! as String))
        .replaceAll('{last}', last);
  }

  final enList = names('personas', lower: true, or: en['listOr']! as String);
  final arList = names(
    'personas.ar',
    lower: false,
    or: ar['listOr']! as String,
  );
  final pairs = <(String, String)>[
    for (final key in en.keys.where((k) => !k.startsWith('@')))
      if (ar[key] case final String arabic) (en[key]! as String, arabic),
    for (final key in ['roleSeeker', 'roleProvider'])
      (
        (en[key]! as String).replaceAll('{list}', enList),
        (ar[key]! as String).replaceAll('{list}', arList),
      ),
    for (final (e, a) in [
      (loadExample('personas'), loadExample('personas.ar')),
    ])
      for (var i = 0; i < (e['personas']! as List).length; i++)
        (
          ((e['personas']! as List)[i] as Map)['singular']! as String,
          ((a['personas']! as List)[i] as Map)['singular']! as String,
        ),
  ];

  final boards = [
    'S09-signin-number',
    'S09b-signin-code',
    'S09d-code-error',
    'S09c-join',
    // 015: guides, article, page, legal, removed.
    'S10b-removed',
    'S11-guides',
    'S11b-guide',
    'S12-page',
    'S13-legal',
  ];

  for (final board in boards) {
    test('$board.json says what app_ar.arb says', () {
      final strings = json('$dir/$board.json');
      expect(strings['keep'], isA<List<Object?>>());
      for (final MapEntry(key: english, value: arabic) in strings.entries) {
        if (english == 'keep' || english == 'cms' || english.startsWith('_')) {
          continue;
        }
        final places = pairs.where((p) => p.$1.contains(english)).toList();
        expect(places, isNotEmpty, reason: '"$english" is not app English');
        expect(
          places.any((p) => p.$2.contains(arabic! as String)),
          isTrue,
          reason: '"$english" → "$arabic" differs from app_ar.arb',
        );
      }
    });
  }
}
