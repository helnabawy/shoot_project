import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/widgets/contact_block.dart';
import 'package:shoot_mobile/features/creator_account/presentation/cubit/bookings_cubit.dart';
import 'package:shoot_mobile/features/creator_account/presentation/pages/bookings_page.dart';

import '../../../helpers/pump_app.dart';
import '../fixtures.dart';

/// Feature 025: a booked creator reaches their client from the booking card.
void main() {
  final now = DateTime.utc(2026, 11, 12, 10);

  Future<List<Uri>> show(WidgetTester tester, String example) async {
    tester.view.physicalSize = const Size(360, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    final opened = <Uri>[];
    await tester.pumpApp(
      BookingsView(
        state: BookingsLoaded(bookings: bookingsExample(example), now: now),
        onRetry: () {},
        onConfirm: (_) {},
        onDecline: (_) {},
        onDeliver: (_) {},
        onCalendar: () {},
        openUrl: (uri) async {
          opened.add(uri);
          return true;
        },
      ),
    );
    await tester.pumpAndSettle();
    return opened;
  }

  test(
    'BC-US2-S1 a confirmed request carries the client contact; others none',
    () {
      final withContact = bookingsExample('creator-bookings-contact');
      expect(withContact.upcoming.first.contact?.phone, '+971521234567');
      expect(withContact.upcoming.first.contact?.name, 'Layla');
      final plain = bookingsExample();
      expect(plain.waiting.first.contact, isNull);
      expect(plain.upcoming.first.contact, isNull);
    },
  );

  testWidgets(
    'BC-US2-S1 the booked card shows the client, their number, Call and WhatsApp',
    (tester) async {
      final opened = await show(tester, 'creator-bookings-contact');
      expect(find.byType(ContactBlock), findsOneWidget);
      expect(find.text('Contact Layla'), findsOneWidget);
      expect(find.text('+971 52 123 4567'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('contact:call')));
      await tester.tap(find.byKey(const ValueKey('contact:whatsapp')));
      expect(opened.map((u) => u.toString()), [
        'tel:+971521234567',
        startsWith('https://wa.me/971521234567'),
      ]);
    },
  );

  testWidgets('BC-US2-S1 a request without contact shows no number', (
    tester,
  ) async {
    await show(tester, 'creator-bookings');
    expect(find.byType(ContactBlock), findsNothing);
    expect(find.textContaining('+971'), findsNothing);
  });
}
