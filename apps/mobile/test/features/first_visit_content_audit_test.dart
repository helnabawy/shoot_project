import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// SC-008 and FR-052: no profession, occasion, place, price or marketing sentence is written in
/// the first-visit and landing code; they come from the CMS through the API. Comments are ignored.
void main() {
  test('ML-SC-008 the brief, welcome, landing and menu code names no profession, occasion, place or price', () {
    const forbidden = [
      'photograph',
      'videograph',
      'wedding',
      'birthday',
      'portrait',
      'dubai',
      'abu dhabi',
      'sharjah',
      'teacher',
      'AED',
      'You brief',
      'We shoot',
    ];
    final roots = [
      'lib/features/brief',
      'lib/features/welcome',
      'lib/features/landing/presentation',
      'lib/features/menu',
    ];
    final hits = <String>[];
    for (final root in roots) {
      for (final file in Directory(root).listSync(recursive: true)) {
        if (file is! File || !file.path.endsWith('.dart')) continue;
        final code = file
            .readAsLinesSync()
            .where((l) => !l.trimLeft().startsWith('//'))
            .join('\n')
            .toLowerCase();
        for (final word in forbidden) {
          if (code.contains(word.toLowerCase())) {
            hits.add('${file.path}: $word');
          }
        }
      }
    }
    expect(hits, isEmpty);
  });

  test('ML-FR-055 and FR-056 the landing shows no ratings, review counts, badges, logos or payment', () {
    const forbidden = [
      'rating',
      'review',
      'testimonial',
      'verified',
      'checkout',
      'pay now',
    ];
    final hits = <String>[];
    for (final root in [
      'lib/features/landing/presentation',
      'lib/features/welcome',
    ]) {
      for (final file in Directory(root).listSync(recursive: true)) {
        if (file is! File || !file.path.endsWith('.dart')) continue;
        final code = file
            .readAsLinesSync()
            .where((l) => !l.trimLeft().startsWith('//'))
            .join('\n')
            .toLowerCase();
        for (final word in forbidden) {
          if (code.contains(word)) hits.add('${file.path}: $word');
        }
      }
    }
    expect(hits, isEmpty);
  });
}
