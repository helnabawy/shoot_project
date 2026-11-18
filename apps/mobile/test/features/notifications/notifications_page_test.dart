import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/l10n/generated/app_localizations.dart';
import 'package:shoot_mobile/features/notifications/data/models/notices_model.dart';
import 'package:shoot_mobile/features/notifications/domain/entities/notice.dart';
import 'package:shoot_mobile/features/notifications/presentation/cubit/notifications_cubit.dart';
import 'package:shoot_mobile/features/notifications/presentation/pages/notifications_page.dart';

import '../../helpers/api_examples.dart';
import '../../helpers/pump_app.dart';

Notices _example() => NoticesModel.fromJson(loadExample('notices')).toEntity();

Notice _notice(
  String event, {
  String? ref = 'B-1',
  NoticeAudience audience = NoticeAudience.creator,
  String? path,
}) => Notice(
  id: '1',
  event: event,
  audience: audience,
  ref: ref,
  path: path,
  createdAt: DateTime.utc(2026, 11, 18, 9),
  read: false,
);

void main() {
  Future<List<Notice>> show(
    WidgetTester tester,
    NotificationsState state, {
    Locale locale = const Locale('en'),
    ThemeMode theme = ThemeMode.light,
  }) async {
    tester.view
      ..physicalSize = const Size(360, 800)
      ..devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    final opened = <Notice>[];
    await tester.pumpApp(
      NotificationsView(state: state, onRetry: () {}, onOpen: opened.add),
      locale: locale,
      themeMode: theme,
    );
    await tester.pump(const Duration(milliseconds: 500));
    return opened;
  }

  group('NT-US1-S1 the Notifications screen', () {
    for (final (locale, theme) in const [
      (Locale('en'), ThemeMode.light),
      (Locale('en'), ThemeMode.dark),
      (Locale('ar'), ThemeMode.light),
      (Locale('ar'), ThemeMode.dark),
    ]) {
      testWidgets('lists new notices, then earlier ones '
          '(${locale.languageCode}, ${theme.name})', (tester) async {
        await show(
          tester,
          NotificationsLoaded(_example()),
          locale: locale,
          theme: theme,
        );
        final ar = locale.languageCode == 'ar';
        expect(find.text(ar ? 'الإشعارات' : 'Notifications'), findsOneWidget);
        expect(find.text(ar ? 'جديد' : 'NEW'), findsOneWidget);
        expect(find.text(ar ? 'سابقاً' : 'EARLIER'), findsOneWidget);
        expect(
          find.text(
            ar ? 'وافق مبدع على طلبك' : 'A creator said yes to your brief',
          ),
          findsOneWidget,
        );
        expect(
          find.text(
            ar ? 'طلب حجز جديد B-2026-0142' : 'New booking request B-2026-0142',
          ),
          findsOneWidget,
        );
        expect(tester.takeException(), isNull);
        // New before earlier.
        final newY = tester
            .getTopLeft(find.byKey(const ValueKey('notice:7')))
            .dy;
        final oldY = tester
            .getTopLeft(find.byKey(const ValueKey('notice:5')))
            .dy;
        expect(newY, lessThan(oldY));
      });
    }

    testWidgets('an unread notice is announced as new', (tester) async {
      final handle = tester.ensureSemantics();
      await show(tester, NotificationsLoaded(_example()));
      expect(
        find.bySemanticsLabel('A creator said yes to your brief, new'),
        findsOneWidget,
      );
      handle.dispose();
    });
  });

  testWidgets('NT-US1-S2 tapping a notice opens it', (tester) async {
    final opened = await show(tester, NotificationsLoaded(_example()));
    await tester.tap(find.text('A creator said yes to your brief'));
    expect(opened.map((n) => n.id), ['12']);
  });

  testWidgets('NT-US1-S3 no notices: a calm empty state', (tester) async {
    await show(
      tester,
      const NotificationsLoaded(Notices(items: [], unread: 0)),
    );
    expect(find.text('Nothing yet'), findsOneWidget);
    expect(
      find.text('News about your bookings and briefs shows here.'),
      findsOneWidget,
    );
  });

  group('NT-US1-S2 where a notice leads', () {
    test('a creator’s booking opens on Bookings', () {
      expect(
        noticeTarget(_notice('accepted', path: '/account/bookings')),
        '/account/bookings/B-1',
      );
    });

    test('a client’s notice follows its path when the app knows it', () {
      expect(
        noticeTarget(
          _notice(
            'brief-accepted',
            audience: NoticeAudience.client,
            path: '/match/B-1/k',
          ),
        ),
        '/match/B-1/k',
      );
      expect(
        noticeTarget(
          _notice(
            'quoted',
            audience: NoticeAudience.client,
            path: '/nowhere/a/b/c',
          ),
        ),
        isNull,
      );
    });

    test('a creator’s brief opens the inbox; nothing leads nowhere', () {
      expect(noticeTarget(_notice('brief-new', ref: null)), '/account/inbox');
      expect(
        noticeTarget(
          _notice('quoted', audience: NoticeAudience.client, ref: null),
        ),
        isNull,
      );
    });
  });

  test('every event has its own words, an unknown one a general line', () {
    final l10n = lookupAppLocalizations(const Locale('en'));
    String text(
      String event, {
      NoticeAudience a = NoticeAudience.client,
      String? ref = 'B-1',
    }) => noticeText(l10n, _notice(event, audience: a, ref: ref));
    expect(text('quoted'), 'Your quotation B-1 is ready');
    expect(text('accepted'), 'You accepted B-1');
    expect(
      text('accepted', a: NoticeAudience.creator),
      'New booking request B-1',
    );
    expect(
      text('reassigned', a: NoticeAudience.creator),
      'New booking request B-1',
    );
    expect(text('confirmed'), 'B-1 is confirmed');
    expect(text('declined'), 'B-1 was declined');
    expect(text('lapsed'), 'B-1 got no answer in time');
    expect(text('adjusted'), 'B-1 was changed');
    expect(text('paid'), 'B-1 is paid. The shoot is on.');
    expect(text('scheduled'), 'B-1 is scheduled');
    expect(text('delivered'), 'B-1 is delivered');
    expect(text('completed'), 'B-1 is complete');
    expect(text('on-hold'), 'B-1 is on hold');
    expect(text('cancelled'), 'B-1 was cancelled');
    expect(text('expired'), 'B-1 expired');
    expect(
      text('brief-new', a: NoticeAudience.creator),
      'A new brief matches you',
    );
    expect(
      text('brief-new', a: NoticeAudience.creator, ref: null),
      'A new brief matches you',
    );
    expect(text('brief-accepted'), 'A creator said yes to your brief');
    expect(text('offer-new'), 'A new offer on your brief');
    expect(
      text('offer-declined', a: NoticeAudience.creator),
      'The client declined your offer',
    );
    expect(
      text('offer-lost', a: NoticeAudience.creator),
      'The client booked another creator',
    );
    expect(text('brief-something'), 'A new update');
    expect(text('something-new'), 'Update on B-1');
    expect(text('something-new', ref: null), 'A new update');
  });
}
