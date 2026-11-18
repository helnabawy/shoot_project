import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../../helpers/account_harness.dart';

/// Feature 025: confirmed bookings are one tap from the client's account.
void main() {
  test(
    'BC-US3-S1 the account home reads its confirmed bookings; none when absent',
    () {
      final home = exampleHome('me-account-confirmed');
      expect(home.confirmed.map((b) => b.reference), ['Q-2026-0120']);
      expect(exampleHome().confirmed, isEmpty);
      expect(home.copyWith(name: 'S').confirmed, home.confirmed);
    },
  );

  testWidgets(
    'BC-US3-S1 "Confirmed bookings" lists them with day, creator, price and state',
    (tester) async {
      await pumpAccount(
        tester,
        repository: FakeAccountRepository(
          home: exampleHome('me-account-confirmed')
              .copyWith(finishAutoOpen: false),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('CONFIRMED BOOKINGS'), findsOneWidget);
      expect(
        find.byKey(const ValueKey('account:confirmed:Q-2026-0120')),
        findsOneWidget,
      );
      expect(find.textContaining('Omar Haddad'), findsOneWidget);
      expect(find.text('Paid'), findsOneWidget);
    },
  );

  testWidgets('BC-US3-S1 no confirmed booking, no group', (tester) async {
    await pumpAccount(
      tester,
      repository: FakeAccountRepository(
        home: exampleHome().copyWith(finishAutoOpen: false),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('CONFIRMED BOOKINGS'), findsNothing);
  });

  testWidgets(
    'BC-US3-S4 a tap opens the booking screen at /account/bookings/{ref}, not a stand-in',
    (tester) async {
      final app = await pumpAccount(
        tester,
        repository: FakeAccountRepository(
          home: exampleHome('me-account-confirmed')
              .copyWith(finishAutoOpen: false),
        ),
        booking: (context, ref) => Text('booking screen $ref'),
      );
      await tester.pumpAndSettle();
      await tester.tap(
        find.byKey(const ValueKey('account:confirmed:Q-2026-0120')),
      );
      await tester.pumpAndSettle();
      expect(locationOf(app.router), '/account/bookings/Q-2026-0120');
      expect(find.text('booking screen Q-2026-0120'), findsOneWidget);
    },
  );
}
