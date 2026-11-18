import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/push/push_banner.dart';
import 'package:shoot_mobile/core/push/push_service.dart';

import '../../helpers/pump_app.dart';
import 'fakes.dart';

const _quote = PushEvent(
  event: 'quote',
  path: '/q/Q-7K2QX/key123',
  title: 'Your quotation is ready',
  body: 'Layla sent a price for 14 December.',
);

/// A push that arrives while the app is open gets no system banner, so the app shows its own.
void main() {
  late StreamController<PushEvent> pushes;
  late List<String> opened;
  late String current;

  setUp(() {
    pushes = StreamController<PushEvent>.broadcast();
    opened = [];
    current = '/account';
  });
  tearDown(() => pushes.close());

  Future<void> pump(
    WidgetTester tester, {
    Locale locale = const Locale('en'),
  }) => tester.pumpApp(
    PushBannerHost(
      events: pushes.stream,
      open: opened.add,
      currentPath: () => current,
      child: const Scaffold(body: Text('page')),
    ),
    locale: locale,
  );

  Future<void> arrive(WidgetTester tester, PushEvent e) async {
    pushes.add(e);
    await tester.pump();
    await tester.pumpAndSettle();
  }

  testWidgets('shows the title and text of a push that arrives in front', (
    tester,
  ) async {
    await pump(tester);
    await arrive(tester, _quote);
    expect(find.text('Your quotation is ready'), findsOneWidget);
    expect(find.text('Layla sent a price for 14 December.'), findsOneWidget);
    expect(find.text('page'), findsOneWidget);
  });

  testWidgets('tapping it opens its page and closes it', (tester) async {
    await pump(tester);
    await arrive(tester, _quote);
    await tester.tap(find.text('Your quotation is ready'));
    await tester.pumpAndSettle();
    expect(opened, ['/q/Q-7K2QX/key123']);
    expect(find.byKey(const Key('push-banner')), findsNothing);
  });

  testWidgets('the close button dismisses it without opening anything', (
    tester,
  ) async {
    await pump(tester);
    await arrive(tester, _quote);
    await tester.tap(find.bySemanticsLabel('Dismiss'));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('push-banner')), findsNothing);
    expect(opened, isEmpty);
  });

  testWidgets('it leaves on its own after five seconds', (tester) async {
    await pump(tester);
    await arrive(tester, _quote);
    await tester.pump(const Duration(seconds: 5));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('push-banner')), findsNothing);
  });

  testWidgets('a push for the page already open shows nothing', (tester) async {
    current = '/q/Q-7K2QX/key123';
    await pump(tester);
    await arrive(tester, _quote);
    expect(find.byKey(const Key('push-banner')), findsNothing);
  });

  testWidgets('a push with no text, or an outside path, opens nothing', (
    tester,
  ) async {
    await pump(tester);
    await arrive(tester, const PushEvent(event: 'quote', path: '/account'));
    expect(find.byKey(const Key('push-banner')), findsNothing);

    await arrive(
      tester,
      const PushEvent(event: 'x', path: 'https://evil.test', title: 'Hi'),
    );
    await tester.tap(find.text('Hi'));
    await tester.pumpAndSettle();
    expect(opened, isEmpty);
  });

  testWidgets('reads right to left in Arabic', (tester) async {
    await pump(tester, locale: const Locale('ar'));
    await arrive(
      tester,
      const PushEvent(
        event: 'quote',
        path: '/account/bookings',
        title: 'عرض السعر جاهز',
      ),
    );
    expect(find.text('عرض السعر جاهز'), findsOneWidget);
    expect(find.bySemanticsLabel('إغلاق'), findsOneWidget);
    final title = tester.getRect(find.text('عرض السعر جاهز'));
    final close = tester.getRect(find.bySemanticsLabel('إغلاق'));
    expect(close.center.dx, lessThan(title.center.dx));
  });

  test('the service passes on the title and text of a push in front', () async {
    final messaging = FakeMessaging();
    final push = service(
      messaging: messaging,
      api: MockPushApi(),
      store: MemoryAskStore(asked: true),
    );
    final seen = <PushEvent>[];
    push.events.listen(seen.add);
    await push.start(open: (_) {});
    messaging.arrivals.add({
      'event': 'quote',
      'path': '/q/A/b',
      'title': 'Ready',
      'body': 'Text',
    });
    await pumpEventQueue();
    expect(seen.single.title, 'Ready');
    expect(seen.single.body, 'Text');
  });
}
