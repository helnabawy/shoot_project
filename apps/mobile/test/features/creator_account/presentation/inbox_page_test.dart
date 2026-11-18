import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/widgets/secondary_button.dart';
import 'package:shoot_mobile/core/widgets/top_hit.dart';
import 'package:shoot_mobile/features/creator_account/domain/entities/inbox.dart';
import 'package:shoot_mobile/features/creator_account/presentation/cubit/account_cubit.dart';
import 'package:shoot_mobile/features/creator_account/presentation/cubit/inbox_cubit.dart';
import 'package:shoot_mobile/features/creator_account/presentation/pages/account_page.dart';
import 'package:shoot_mobile/features/creator_account/presentation/pages/inbox_page.dart';
import 'package:shoot_mobile/features/creator_account/presentation/widgets/brief_details.dart';
import 'package:shoot_mobile/features/creator_account/presentation/widgets/reject_sheet.dart';

import '../../../helpers/pump_app.dart';
import '../fixtures.dart';

void main() {
  void phone(WidgetTester tester) {
    tester.view.physicalSize = const Size(360, 1600);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
  }

  Future<void> show(
    WidgetTester tester,
    InboxState state, {
    List<String>? log,
    Locale locale = const Locale('en'),
    String? focusRef,
    ValueChanged<BriefPlace>? onOpenPlace,
  }) async {
    phone(tester);
    await tester.pumpApp(
      InboxView(
        state: state,
        focusRef: focusRef,
        onRetry: () => log?.add('retry'),
        onAccept: (i) => log?.add('accept ${i.ref}'),
        onReject: (i) => log?.add('reject ${i.ref}'),
        onWithdraw: (i) => log?.add('withdraw ${i.ref}'),
        onOffer: (i) => log?.add('offer ${i.ref}'),
        onOpenPlace: onOpenPlace ?? (p) => log?.add('map ${p.area}'),
        mapTiles: false,
      ),
      locale: locale,
    );
    await tester.pump(const Duration(seconds: 2));
  }

  group('the brief card details', () {
    testWidgets(
      'Duration sits right under When, the area shows on a map and the price stands out',
      (tester) async {
        await show(tester, InboxLoaded(inboxExample('creator-briefs-offers')));
        final card = find.byKey(const Key('inbox-place'));
        expect(card, findsOneWidget);
        expect(find.byType(BriefMap), findsOneWidget);
        expect(find.text('Duration'), findsOneWidget);
        expect(find.text('2 hours'), findsOneWidget);
        final whenY = tester.getTopLeft(find.text('When').first).dy;
        final durationY = tester.getTopLeft(find.text('Duration')).dy;
        final asY = tester.getTopLeft(find.text('As').first).dy;
        final placeY = tester.getTopLeft(card).dy;
        expect(whenY < durationY && durationY < asY && asY < placeY, isTrue);
        expect(find.text('Yas Island, Abu Dhabi'), findsOneWidget);
        expect(
          find.text('About 22 km from you · exact place after booking'),
          findsOneWidget,
        );
        expect(find.text('Open in Maps'), findsOneWidget);
        expect(
          find.descendant(
            of: find.byKey(const Key('inbox-client-price')),
            matching: find.text('AED 800'),
          ),
          findsOneWidget,
        );
      },
    );

    testWidgets('a tap on the place opens it in the maps app', (tester) async {
      final opened = <BriefPlace>[];
      await show(
        tester,
        InboxLoaded(inboxExample('creator-briefs-offers')),
        onOpenPlace: opened.add,
      );
      await tester.tap(find.byKey(const Key('inbox-place')));
      expect(opened.single.area, 'Yas Island');
      expect(opened.single.point, (lat: 24.47, lng: 54.61));
    });

    testWidgets('a brief without a duration shows no Duration row', (
      tester,
    ) async {
      await show(tester, InboxLoaded(inboxExample()));
      expect(find.text('Duration'), findsNothing);
      expect(find.byType(BriefMap), findsNothing);
    });

    test('the maps address uses the public point, per platform', () {
      const place = BriefPlace(
        area: 'Yas Island',
        emirate: 'Abu Dhabi',
        point: (lat: 24.47, lng: 54.61),
      );
      expect(
        mapsUriFor(place, platform: TargetPlatform.iOS).toString(),
        'https://maps.apple.com/?q=Yas+Island%2C+Abu+Dhabi&ll=24.47%2C54.61',
      );
      expect(
        mapsUriFor(place, platform: TargetPlatform.android).toString(),
        'geo:24.47,54.61?q=24.47%2C54.61(Yas%20Island%2C%20Abu%20Dhabi)',
      );
      expect(
        mapsUriFor(place, platform: TargetPlatform.fuchsia).toString(),
        'https://www.google.com/maps/search/?api=1&query=24.47%2C54.61',
      );
      const noPoint = BriefPlace(area: 'Yas Island', emirate: 'Abu Dhabi');
      expect(
        mapsUriFor(noPoint, platform: TargetPlatform.android).toString(),
        'geo:0,0?q=Yas%20Island%2C%20Abu%20Dhabi',
      );
    });
  });

  group('BI-US1 the inbox screen', () {
    testWidgets(
      'BI-US1-S7 open briefs with one red action; the rest are secondary',
      (tester) async {
        final log = <String>[];
        await show(tester, InboxLoaded(inboxExample()), log: log);
        expect(find.text('New briefs'), findsOneWidget);
        // What it is, the client's own words, then when, where and as what.
        expect(find.text('A birthday party'), findsOneWidget);
        expect(
          find.text(
            'I need a photographer for a birthday party in Dubai on 20 Nov',
          ),
          findsOneWidget,
        );
        expect(find.text('Date to agree'), findsOneWidget);
        expect(find.text('Dubai'), findsWidgets);
        expect(find.text('Photographer'), findsWidgets);
        // What "Not for me" does is said once, under the first brief.
        expect(
          find.text("Not for me hides it for you only. The client isn't told."),
          findsOneWidget,
        );
        expect(find.widgetWithText(TopHit, 'I can do this'), findsOneWidget);
        expect(
          find.widgetWithText(SecondaryButton, 'I can do this'),
          findsOneWidget,
        );
        await tester.tap(find.widgetWithText(TopHit, 'I can do this'));
        await tester.tap(
          find.widgetWithText(SecondaryButton, 'Not for me').first,
        );
        expect(log, ['accept BR-7K2Q', 'reject BR-7K2Q']);
      },
    );

    testWidgets(
      'BI-US2-S1 BI-US3-S4 answered briefs: take back a yes, undo a no',
      (tester) async {
        final log = <String>[];
        await show(
          tester,
          InboxLoaded(inboxExample('creator-briefs-answered')),
          log: log,
        );
        expect(find.text('YOU SAID YES'), findsOneWidget);
        expect(find.text('NOT FOR YOU'), findsOneWidget);
        expect(find.textContaining('Too far'), findsOneWidget);
        await tester.tap(find.text('Take back my yes'));
        await tester.tap(find.text('Undo'));
        expect(log, ['withdraw BR-7K2Q', 'withdraw BR-2MLA']);
      },
    );

    testWidgets('BI-US2-S7 a refused answer says why; an empty inbox says so', (
      tester,
    ) async {
      const empty = CreatorInbox(
        open: [],
        accepted: [],
        rejected: [],
        reasons: [],
      );
      await show(
        tester,
        const InboxLoaded(
          empty,
          failure: ServerFailure(
            statusCode: 409,
            code: 'inbox.errors.briefClosed',
          ),
        ),
      );
      expect(find.text('This brief is no longer open.'), findsOneWidget);
      expect(find.text('No new briefs match you right now.'), findsOneWidget);
    });

    testWidgets('BI-US1-S7 in Arabic the screen reads right to left', (
      tester,
    ) async {
      await show(
        tester,
        InboxLoaded(inboxExample()),
        locale: const Locale('ar'),
      );
      expect(find.text('طلبات جديدة'), findsOneWidget);
      expect(
        Directionality.of(tester.element(find.text('طلبات جديدة'))),
        TextDirection.rtl,
      );
      expect(find.text('أستطيع القيام بذلك'), findsNWidgets(2));
    });
  });

  group('BI-US3-S2 the "Not for me" sheet', () {
    testWidgets(
      'an optional reason from the content list and an optional note',
      (tester) async {
        phone(tester);
        final inbox = inboxExample();
        RejectAnswer? result;
        await tester.pumpApp(
          Builder(
            builder: (context) => TextButton(
              onPressed: () async => result = await showRejectSheet(
                context,
                item: inbox.open.first,
                reasons: inbox.reasons,
              ),
              child: const Text('open'),
            ),
          ),
        );
        await tester.tap(find.text('open'));
        await tester.pumpAndSettle();
        expect(find.text('WHY (OPTIONAL)'), findsOneWidget);
        await tester.tap(find.text('Too far'));
        await tester.enterText(find.byType(TextField), '  Only Marina  ');
        await tester.tap(find.widgetWithText(TopHit, 'Not for me'));
        await tester.pumpAndSettle();
        expect(result!.reason, 'too-far');
        expect(result!.note, 'Only Marina');
      },
    );

    testWidgets('sending with nothing chosen is fine', (tester) async {
      phone(tester);
      final inbox = inboxExample();
      RejectAnswer? result;
      await tester.pumpApp(
        Builder(
          builder: (context) => TextButton(
            onPressed: () async => result = await showRejectSheet(
              context,
              item: inbox.open.first,
              reasons: inbox.reasons,
            ),
            child: const Text('open'),
          ),
        ),
      );
      await tester.tap(find.text('open'));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(TopHit, 'Not for me'));
      await tester.pumpAndSettle();
      expect(result!.reason, isNull);
      expect(result!.note, isNull);
    });
  });

  group('BI-US1-S1 Up next on the account screen', () {
    testWidgets('leads with matching briefs and opens the inbox', (
      tester,
    ) async {
      phone(tester);
      final opened = <String>[];
      await tester.pumpApp(
        AccountView(
          state: AccountLoaded(accountWithBriefsExample()),
          onRetry: () {},
          onOpen: opened.add,
          onLogOut: () {},
        ),
      );
      await tester.pump(const Duration(seconds: 2));
      expect(find.text('2 new briefs match you'), findsOneWidget);
      await tester.tap(find.widgetWithText(TopHit, 'See the briefs'));
      expect(opened, ['/account/inbox']);
    });
  });

  group('OF-SC-002 two taps from the push', () {
    testWidgets('the brief the push opened comes first with the red Accept', (
      tester,
    ) async {
      final inbox = inboxExample();
      final second = inbox.open[1];
      final log = <String>[];
      await show(
        tester,
        InboxLoaded(inbox),
        log: log,
        focusRef: second.ref.toLowerCase(),
      );
      await tester.tap(find.byType(TopHit).first);
      expect(log, ['accept ${second.ref}']);
    });
  });
}
