import 'dart:ui';

import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/l10n/app_locales.dart';

void main() {
  test('supports English and Arabic', () {
    expect(
      AppLocales.supported.map((l) => l.languageCode),
      unorderedEquals(['en', 'ar']),
    );
  });

  test('matches on language, ignoring the region', () {
    expect(AppLocales.resolve(const [Locale('ar', 'AE')]), AppLocales.arabic);
    expect(AppLocales.resolve(const [Locale('en', 'GB')]), AppLocales.english);
  });

  test('takes the first preferred language the app supports', () {
    expect(
      AppLocales.resolve(const [Locale('fr'), Locale('ar'), Locale('en')]),
      AppLocales.arabic,
    );
  });

  test('falls back to English', () {
    expect(AppLocales.resolve(const [Locale('fr')]), AppLocales.english);
    expect(AppLocales.resolve(null), AppLocales.english);
  });
}
