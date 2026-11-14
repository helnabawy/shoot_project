import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

import '../../helpers/api_examples.dart';

/// The app's link configuration must list exactly the paths the website's association files
/// claim (`APP_LINK_PREFIXES`, through `examples/app-links.json`), so a link the site sends to
/// the app is one the app accepts.
void main() {
  group('MR-US5-S6 app link configuration', () {
    final prefixes = (loadExample('app-links')['prefixes']! as List)
        .cast<String>()
        .toSet();

    test('Android has one verified https filter for the app link host whose '
        'paths equal app-links.json', () {
      final manifest = File('android/app/src/main/AndroidManifest.xml')
          .readAsStringSync()
          .replaceAll(RegExp('<!--.*?-->', dotAll: true), '');
      final filters = RegExp(
        r'<intent-filter\b([^>]*)>(.*?)</intent-filter>',
        dotAll: true,
      ).allMatches(manifest);
      final verified = [
        for (final f in filters)
          if (RegExp(r'android:autoVerify="true"').hasMatch(f.group(1)!))
            f.group(2)!,
      ];
      expect(verified, hasLength(1));

      final body = verified.single;
      List<String> attr(String name) => [
        for (final m in RegExp('android:$name="([^"]*)"').allMatches(body))
          m.group(1)!,
      ];
      expect(attr('scheme'), ['https']);
      expect(attr('host'), [r'${appLinkHost}']);
      expect(body, contains('android.intent.action.VIEW'));
      expect(body, contains('android.intent.category.BROWSABLE'));

      final paths = attr('path');
      final pathPrefixes = attr('pathPrefix');
      expect(paths.toSet(), {'/', '/ar'}, reason: 'the homes are exact paths');
      final all = [...paths, ...pathPrefixes];
      expect(all, hasLength(all.toSet().length), reason: 'no entry twice');
      expect(all.toSet(), prefixes);
    });

    test('the Android build sets the appLinkHost placeholder', () {
      final gradle = File('android/app/build.gradle.kts').readAsStringSync();

      expect(gradle, contains('manifestPlaceholders["appLinkHost"]'));
    });

    test('iOS claims applinks:\$(APP_LINK_HOST) as an associated domain', () {
      final plist = File('ios/Runner/Runner.entitlements')
          .readAsStringSync()
          .replaceAll(RegExp('<!--.*?-->', dotAll: true), '');
      final domains = RegExp(
        r'<key>com\.apple\.developer\.associated-domains</key>\s*<array>(.*?)</array>',
        dotAll: true,
      ).firstMatch(plist);
      expect(domains, isNotNull);

      final values = [
        for (final m in RegExp(
          '<string>([^<]*)</string>',
        ).allMatches(domains!.group(1)!))
          m.group(1)!,
      ];
      expect(values, [r'applinks:$(APP_LINK_HOST)']);
    });

    test('every iOS build configuration sets APP_LINK_HOST', () {
      for (final name in ['Debug', 'Release']) {
        final xcconfig = File('ios/Flutter/$name.xcconfig').readAsStringSync();
        expect(
          RegExp(r'^APP_LINK_HOST=\S+$', multiLine: true).hasMatch(xcconfig),
          isTrue,
          reason: '$name.xcconfig',
        );
      }
    });
  });
}
