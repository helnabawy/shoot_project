import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/contact/booking_contact.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/widgets/contact_block.dart';
import 'package:shoot_mobile/core/widgets/top_hit.dart';

import '../../helpers/pump_app.dart';
import '../../helpers/quick_match_fixtures.dart';
import '../../helpers/quick_match_harness.dart';
import '../../helpers/sign_in_harness.dart';

/// Feature 025: the client reaches their booked creator from the booking screen.
void main() {
  group('BC-US1-S1 the booking view carries the booked creators\' contact', () {
    test('BC-US1-S1 contacts and the private key are read when sent', () {
      final view = exampleView('contact');
      expect(view.contacts, const [
        BookingContact(
          name: 'Omar K.',
          role: 'Photographer',
          phone: '+971501234567',
          whatsappUrl: 'https://wa.me/971501234567?text=Hi%20Omar%2C%20this%20is%20about%20booking%20Q-4F8Z2%20on%20Shoot.',
        ),
      ]);
      expect(view.contacts.single.display, '+971 50 123 4567');
      expect(view.contacts.single.callUri.toString(), 'tel:+971501234567');
      expect(view.key, isNotNull);
    });

    test(
      'BC-US1-S1 an answer without them (an older server, a guest) has none',
      () {
        final view = exampleView('confirmed');
        expect(view.contacts, isEmpty);
        expect(view.key, isNull);
      },
    );

    test('BC-US1-S1 a number from another country is shown as it is', () {
      const contact = BookingContact(
        name: 'A',
        role: '',
        phone: '+442079460958',
        whatsappUrl: 'https://wa.me/442079460958',
      );
      expect(contact.display, '+442079460958');
    });
  });

  group('BC-US1-S1 the booking screen', () {
    late MockQuickMatchRepository repository;
    setUp(() => repository = MockQuickMatchRepository());

    testWidgets(
      'BC-US1-S1 shows who, the number left to right, Call and WhatsApp as secondary actions',
      (tester) async {
        when(() => repository.getBooking(any(), any()))
            .thenAnswer((_) async => Ok(exampleView('contact')));
        final opener = RecordingOpener();
        await pumpQuickMatch(
          tester,
          repository: repository,
          location: '/q/Q-4F8Z2/key',
          signedIn: true,
          opener: opener,
        );
        await tester.pumpAndSettle();

        expect(find.byType(ContactBlock), findsOneWidget);
        expect(find.text('Contact Omar K. · Photographer'), findsOneWidget);
        final number = tester.widget<Text>(find.text('+971 50 123 4567'));
        expect(number.textDirection, TextDirection.ltr);
        // One primary action: contact never adds a second.
        expect(find.byType(TopHit), findsOneWidget);

        await tester.ensureVisible(find.byKey(const ValueKey('contact:call')));
        await tester.tap(find.byKey(const ValueKey('contact:call')));
        await tester.tap(find.byKey(const ValueKey('contact:whatsapp')));
        expect(opener.opened.map((u) => u.toString()), [
          'tel:+971501234567',
          startsWith('https://wa.me/971501234567?text='),
        ]);
      },
    );

    testWidgets('BC-US1-S1 no contact sent, no contact block', (tester) async {
      when(() => repository.getBooking(any(), any()))
          .thenAnswer((_) async => Ok(exampleView('confirmed')));
      await pumpQuickMatch(
        tester,
        repository: repository,
        location: '/q/Q-4F8Z2/key',
      );
      await tester.pumpAndSettle();
      expect(find.byType(ContactBlock), findsNothing);
      expect(find.textContaining('+971'), findsNothing);
    });

    testWidgets('BC-US1-S1 Arabic words, the number still left to right', (
      tester,
    ) async {
      await tester.pumpApp(
        ContactBlock(contact: exampleView('contact').contacts.single),
        locale: const Locale('ar'),
      );
      await tester.pumpAndSettle();
      expect(find.text('اتصال'), findsOneWidget);
      expect(find.text('واتساب'), findsOneWidget);
      expect(
        tester.widget<Text>(find.text('+971 50 123 4567')).textDirection,
        TextDirection.ltr,
      );
    });
  });
}
