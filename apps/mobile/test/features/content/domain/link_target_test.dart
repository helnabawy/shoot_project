import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/routing/app_routes.dart';
import 'package:shoot_mobile/features/content/domain/link_target.dart';

void main() {
  final base = Uri.parse('https://shoot.example');
  LinkTarget link(String href, {bool inApp = true}) =>
      resolveLink(href, hasAppRoute: (_) => inApp, siteBase: base);

  group('MG-US2-S5 links in CMS text', () {
    test('MG-US2-S5 a site path the app has opens in the app, without /ar', () {
      expect(link('/guides/x'), const InApp('/guides/x'));
      expect(link('/ar/guides/x'), const InApp('/guides/x'));
      expect(link('/ar'), const InApp('/'));
      expect(link('/guides?page=2'), const InApp('/guides?page=2'));
      expect(link('https://shoot.example/privacy'), const InApp('/privacy'));
    });

    test('MG-US2-S5 a site path the app lacks opens on the website', () {
      expect(
        link('/ar/studios', inApp: false),
        External(Uri.parse('https://shoot.example/ar/studios')),
      );
    });

    test('MG-US2-S5 other web, mail and phone addresses are external', () {
      expect(
        link('https://other.example/a'),
        External(Uri.parse('https://other.example/a')),
      );
      expect(
        link('mailto:hi@shoot.example'),
        External(Uri.parse('mailto:hi@shoot.example')),
      );
      expect(link('tel:+971501234567'), isA<External>());
    });

    test('MG-US2-S5 unsafe or unreadable addresses are not links', () {
      for (final href in [
        'javascript:alert(1)',
        'data:text/html,x',
        '//evil.example',
        'relative/path',
        '',
        '  ',
        'https://',
      ]) {
        expect(link(href), const Inert(), reason: href);
      }
    });
  });

  group('MG-US2-S5 appHasRoute follows the route table', () {
    const table = [
      AppRoute('/creators', owner: '011', example: '/creators'),
      AppRoute('/guides', owner: '015', example: '/guides', built: true),
      AppRoute(
        '/guides/:slug',
        owner: '015',
        example: '/guides/x',
        built: true,
      ),
      AppRoute('/:slug', owner: '015', example: '/about', built: true),
    ];

    test('MG-US2-S5 built routes are in the app, unbuilt ones are not', () {
      expect(appHasRoute('/guides', table: table), isTrue);
      expect(appHasRoute('/guides/how-to', table: table), isTrue);
      expect(appHasRoute('/creators', table: table), isFalse);
    });

    test('MG-US2-S5 a single unnamed segment is a page, the feed is not', () {
      expect(appHasRoute('/about', table: table), isTrue);
      expect(appHasRoute('/guides/feed', table: table), isFalse);
      expect(appHasRoute('/a/b/c', table: table), isFalse);
    });
  });
}
