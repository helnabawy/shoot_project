import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/auth/session_cubit.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/routing/app_router.dart';
import 'package:shoot_mobile/features/account/domain/entities/account.dart';

import '../../../helpers/account_harness.dart';

Finder _text(String text) => find.text(text);

void main() {
  group('My account (24)', () {
    testWidgets(
      'MK-US1-S1 shows who you are, Up next, the rows, the briefs and Log out',
      (tester) async {
        final repository = FakeAccountRepository();
        await pumpAccount(tester, repository: repository);
        // The account opens 25 on its own after a first booking; step back to 24 first.
        expect(find.text('Finish your account'), findsOneWidget);
        await tester.tap(_text('Later'));
        await tester.pumpAndSettle();

        expect(_text('Sara'), findsOneWidget);
        expect(find.textContaining('+971 50 123 4567'), findsOneWidget);
        expect(
          find.textContaining('Client', findRichText: true),
          findsOneWidget,
        );
        expect(_text('Up next'.toUpperCase()), findsOneWidget);
        expect(_text('In your account'.toUpperCase()), findsOneWidget);
        expect(_text('Bookings'), findsOneWidget);
        expect(_text('1 waiting for you'), findsOneWidget);
        expect(_text('Your details'), findsOneWidget);
        expect(_text('2 of 4'), findsOneWidget);
        expect(_text('Language and theme'), findsOneWidget);
        expect(_text('English · auto'), findsOneWidget);
        expect(_text('Start a brief'), findsOneWidget);
        expect(_text('Log out'), findsOneWidget);
      },
    );

    testWidgets(
      'MK-US1-S2 Up next shows the booking and "Review the quotation" opens it',
      (tester) async {
        final repository = FakeAccountRepository(
          home: exampleHome().copyWith(finishAutoOpen: false),
        );
        final app = await pumpAccount(tester, repository: repository);
        expect(_text('Awaiting your acceptance'), findsOneWidget);
        expect(_text('Your quotation is ready'), findsOneWidget);
        expect(find.textContaining('Wedding · Dubai'), findsWidgets);
        expect(find.textContaining('Omar Haddad'), findsOneWidget);
        expect(find.textContaining('AED 2,800'), findsOneWidget);
        await tester.tap(_text('Review the quotation'));
        await tester.pumpAndSettle();
        expect(locationOf(app.router), '/account/bookings/Q-2026-0142');
        expect(find.text('Q-2026-0142'), findsOneWidget);
      },
    );

    testWidgets(
      'MK-US1-S3 shows only the most urgent item (the home carries one)',
      (tester) async {
        final repository = FakeAccountRepository(
          home: exampleHome().copyWith(finishAutoOpen: false),
        );
        await pumpAccount(tester, repository: repository);
        expect(find.text('Review the quotation'), findsOneWidget);
        expect(find.text('Open your booking'), findsNothing);
      },
    );

    testWidgets(
      'MK-US1-S4 with nothing up next, "Start a brief" is the primary action',
      (tester) async {
        final repository = FakeAccountRepository(
          home: exampleHome('me-account-empty'),
        );
        final app = await pumpAccount(tester, repository: repository);
        expect(_text('Up next'.toUpperCase()), findsNothing);
        expect(_text('Your account'), findsOneWidget);
        expect(_text('No briefs yet.'), findsOneWidget);
        await tester.tap(find.byKey(const ValueKey('fidelity:topHit')));
        await tester.pumpAndSettle();
        expect(locationOf(app.router), '/');
      },
    );

    testWidgets(
      'MK-US1-S5 lists each brief with its date and status in words',
      (tester) async {
        final repository = FakeAccountRepository(
          home: exampleHome().copyWith(finishAutoOpen: false),
        );
        await pumpAccount(tester, repository: repository);
        expect(
          _text('A wedding photographer in Dubai on 12 December'),
          findsOneWidget,
        );
        expect(_text('Sent 10 Nov'), findsOneWidget);
        expect(_text('We replied'), findsOneWidget);
      },
    );

    test('MK-US1-S6 a signed-out person is sent to sign in and back', () {
      for (final path in ['/account', '/account/finish', '/account/bookings']) {
        expect(
          authRedirect(Uri.parse(path), const SignedOut()),
          '/login?next=${Uri.encodeComponent(path)}',
        );
      }
    });

    testWidgets(
      'MK-US1-S7 a creator account is sent away from the client account',
      (tester) async {
        final repository = FakeAccountRepository()
          ..home = const Err(NotFoundFailure());
        final app = await pumpAccount(tester, repository: repository);
        // 014 built the creator's own account: a creator lands on their profile.
        expect(locationOf(app.router), '/account/profile');
      },
    );

    testWidgets(
      'a failed read shows the something-went-wrong screen with Try again',
      (tester) async {
        final repository = FakeAccountRepository()
          ..home = const Err(NetworkFailure());
        await pumpAccount(tester, repository: repository);
        expect(_text('Try again'), findsOneWidget);
        repository.home = Ok(exampleHome().copyWith(finishAutoOpen: false));
        await tester.tap(_text('Try again'));
        await tester.pumpAndSettle();
        expect(_text('Sara'), findsOneWidget);
      },
    );

    testWidgets(
      'renders right to left in Arabic with the number kept left to right',
      (tester) async {
        final repository = FakeAccountRepository(
          home: exampleHome().copyWith(finishAutoOpen: false),
        );
        await pumpAccount(
          tester,
          repository: repository,
          locale: const Locale('ar'),
        );
        expect(
          Directionality.of(tester.element(find.text('Sara'))),
          TextDirection.rtl,
        );
        expect(find.textContaining('عميل', findRichText: true), findsOneWidget);
        expect(find.textContaining('+971 50 123 4567'), findsOneWidget);
      },
    );

    testWidgets('MK-US4-S1 Log out ends the session and opens the landing', (
      tester,
    ) async {
      final repository = FakeAccountRepository(
        home: exampleHome().copyWith(finishAutoOpen: false),
      );
      final app = await pumpAccount(tester, repository: repository);
      await tester.tap(find.byKey(const ValueKey('account:logOut')));
      await tester.pumpAndSettle();
      verify(() => app.api.logout(any())).called(1);
      expect(app.session.state, isA<SignedOut>());
      expect(locationOf(app.router), '/');
      expect(_text('landing'), findsOneWidget);
      // MK-US4-S2: nothing of the client's is on screen.
      expect(find.textContaining('Sara'), findsNothing);
      expect(find.textContaining('+971'), findsNothing);
    });
  });

  group('Finish your account (25)', () {
    testWidgets(
      'MK-US3-S1 MK-US3-S2 opens once with the checklist, progress and the first unfinished item as the primary action',
      (tester) async {
        final repository = FakeAccountRepository();
        await pumpAccount(tester, repository: repository);
        expect(_text('Finish your account'), findsOneWidget);
        expect(_text('2 of 4'), findsOneWidget);
        expect(_text('Mobile number verified'), findsOneWidget);
        expect(find.textContaining('+971 50 123 4567'), findsOneWidget);
        expect(_text('Email for quotes and receipts'), findsOneWidget);
        expect(_text('Add email'), findsOneWidget);
        expect(
          _text('Find your quotations and bookings again without a link.'),
          findsOneWidget,
        );
        expect(repository.calls.where((c) => c == 'shown'), hasLength(1));
      },
    );

    testWidgets(
      'MK-US3-S3 adding a valid email ticks it, advances the count and the primary action',
      (tester) async {
        final repository = FakeAccountRepository();
        await pumpAccount(tester, repository: repository);
        await tester.tap(_text('Add email'));
        await tester.pumpAndSettle();
        await tester.enterText(
          find.byKey(const ValueKey('finish:email')),
          'sara@example.ae',
        );
        await tester.tap(_text('Save'));
        await tester.pumpAndSettle();
        expect(
          repository.calls,
          contains('update name=null email=sara@example.ae'),
        );
        expect(_text('sara@example.ae'), findsOneWidget);
        expect(_text('3 of 4'), findsOneWidget);
        expect(_text('Set language and theme'), findsOneWidget);
      },
    );

    testWidgets('MK-US3-S4 an invalid email shows one line and saves nothing', (
      tester,
    ) async {
      final repository = FakeAccountRepository();
      await pumpAccount(tester, repository: repository);
      await tester.tap(_text('Add email'));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const ValueKey('finish:email')),
        'nope',
      );
      await tester.tap(_text('Save'));
      await tester.pumpAndSettle();
      expect(_text('Enter an email like name@example.com.'), findsOneWidget);
      expect(repository.calls.where((c) => c.startsWith('update')), isEmpty);
    });

    testWidgets(
      'MK-US3-S4 an email another account uses is refused in one line',
      (tester) async {
        final repository = FakeAccountRepository()
          ..update = const Err(
            ServerFailure(
              statusCode: 422,
              fields: [(path: 'body.email', code: 'account.errors.emailInUse')],
            ),
          );
        await pumpAccount(tester, repository: repository);
        await tester.tap(_text('Add email'));
        await tester.pumpAndSettle();
        await tester.enterText(
          find.byKey(const ValueKey('finish:email')),
          'taken@example.ae',
        );
        await tester.tap(_text('Save'));
        await tester.pumpAndSettle();
        expect(
          _text('Another account already uses this email.'),
          findsOneWidget,
        );
      },
    );

    testWidgets(
      'MK-US3-S5 "Later" closes it for good: My account shows and 25 does not reopen',
      (tester) async {
        final repository = FakeAccountRepository();
        final app = await pumpAccount(tester, repository: repository);
        await tester.tap(_text('Later'));
        await tester.pumpAndSettle();
        expect(locationOf(app.router), '/account');
        expect(_text('Sara'), findsOneWidget);
        // Reopened later, the server no longer asks for it.
        await tester.tap(_text('Your details'));
        await tester.pumpAndSettle();
        expect(locationOf(app.router), '/account/finish');
        expect(_text('Finish your account'), findsOneWidget);
        expect(repository.calls.where((c) => c == 'shown'), hasLength(1));
      },
    );

    testWidgets('MK-US3-S6 editing the name saves it', (tester) async {
      final repository = FakeAccountRepository();
      await pumpAccount(tester, repository: repository);
      await tester.tap(_text('Edit'));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const ValueKey('finish:name')),
        'Sara Al Mansoori',
      );
      await tester.tap(_text('Save'));
      await tester.pumpAndSettle();
      expect(
        repository.calls,
        contains('update name=Sara Al Mansoori email=null'),
      );
    });

    testWidgets(
      'MK-US3-S7 language and theme apply at once through the appearance sheet',
      (tester) async {
        final repository = FakeAccountRepository();
        await pumpAccount(tester, repository: repository);
        await tester.tap(_text('Set').first);
        await tester.pumpAndSettle();
        expect(find.byKey(const Key('appearance-sheet')), findsOneWidget);
      },
    );

    testWidgets(
      'MK-US3-S8 with everything done it says so and returns to My account',
      (tester) async {
        final done = exampleHome().copyWith(
          finishAutoOpen: false,
          finishItems: const [
            FinishItem(
              key: FinishKey.number,
              done: true,
              value: '+971501234567',
            ),
            FinishItem(key: FinishKey.name, done: true, value: 'Sara'),
            FinishItem(
              key: FinishKey.email,
              done: true,
              value: 'sara@example.ae',
            ),
          ],
        );
        final repository = FakeAccountRepository(home: done);
        final app = await pumpAccount(
          tester,
          repository: repository,
          location: '/account/finish',
          locale: const Locale('en'),
        );
        expect(find.textContaining('Everything is done'), findsOneWidget);
        expect(_text('4 of 4'), findsOneWidget);
        await tester.tap(_text('Back to my account'));
        await tester.pumpAndSettle();
        expect(locationOf(app.router), '/account');
      },
    );
  });

  group('Your bookings (26)', () {
    testWidgets(
      'MK-US2-S1 groups Upcoming and Past with a status badge in words',
      (tester) async {
        final repository = FakeAccountRepository();
        await pumpAccount(
          tester,
          repository: repository,
          location: '/account/bookings',
        );
        expect(_text('Your bookings'), findsOneWidget);
        expect(find.textContaining('Signed in as'), findsOneWidget);
        expect(find.textContaining('+971 50 123 4567'), findsOneWidget);
        expect(_text('Upcoming'.toUpperCase()), findsOneWidget);
        expect(_text('Past'.toUpperCase()), findsOneWidget);
        expect(_text('Wedding · Dubai'), findsOneWidget);
        expect(find.textContaining('Sat 12 Dec, 16:00'), findsOneWidget);
        expect(_text('Awaiting your acceptance'), findsOneWidget);
        expect(_text('Completed'), findsOneWidget);
        expect(_text('Start a new brief'), findsOneWidget);
      },
    );

    testWidgets('MK-US2-S2 a booking row opens its page', (tester) async {
      final repository = FakeAccountRepository();
      final app = await pumpAccount(
        tester,
        repository: repository,
        location: '/account/bookings',
      );
      await tester.tap(_text('Wedding · Dubai'));
      await tester.pumpAndSettle();
      expect(locationOf(app.router), '/account/bookings/Q-2026-0142');
    });

    testWidgets('MK-US2-S3 the Briefs tab lists the briefs', (tester) async {
      final repository = FakeAccountRepository();
      await pumpAccount(
        tester,
        repository: repository,
        location: '/account/bookings',
      );
      await tester.tap(_text('Briefs'));
      await tester.pumpAndSettle();
      expect(
        _text('A videographer for a brand shoot in Sharjah'),
        findsOneWidget,
      );
      expect(_text('We received it'), findsOneWidget);
    });

    testWidgets('MK-US2-S4 the Settings tab shows the details and Log out', (
      tester,
    ) async {
      final repository = FakeAccountRepository(
        home: exampleHome().copyWith(finishAutoOpen: false),
      );
      await pumpAccount(
        tester,
        repository: repository,
        location: '/account/bookings',
      );
      await tester.tap(_text('Settings'));
      await tester.pumpAndSettle();
      expect(_text('Mobile number'), findsOneWidget);
      expect(_text('Name'), findsOneWidget);
      expect(_text('Sara'), findsOneWidget);
      expect(_text('Email'), findsOneWidget);
      expect(_text('Language and theme'), findsOneWidget);
      expect(find.byKey(const ValueKey('settings:logOut')), findsOneWidget);
    });

    testWidgets(
      'MK-US2-S5 with no bookings an empty state and "Start a new brief"',
      (tester) async {
        final repository = FakeAccountRepository(
          bookings: const BookingList(
            upcoming: [],
            past: [],
            page: 1,
            hasMore: false,
          ),
        );
        final app = await pumpAccount(
          tester,
          repository: repository,
          location: '/account/bookings',
        );
        expect(_text('You have no bookings yet.'), findsOneWidget);
        await tester.tap(_text('Start a new brief'));
        await tester.pumpAndSettle();
        expect(locationOf(app.router), '/');
      },
    );

    testWidgets('loads the next page of Past when asked', (tester) async {
      final first = exampleBookings();
      final repository = FakeAccountRepository(
        bookings: BookingList(
          upcoming: first.upcoming,
          past: first.past,
          page: 1,
          hasMore: true,
        ),
      );
      await pumpAccount(
        tester,
        repository: repository,
        location: '/account/bookings',
      );
      await tester.tap(_text('Show more'));
      await tester.pumpAndSettle();
      expect(repository.bookingPages, [1, 2]);
    });

    testWidgets('a failed read shows the something-went-wrong screen', (
      tester,
    ) async {
      final repository = FakeAccountRepository()
        ..bookings = const Err(NetworkFailure());
      await pumpAccount(
        tester,
        repository: repository,
        location: '/account/bookings',
      );
      expect(_text('Try again'), findsOneWidget);
    });

    testWidgets('renders the badges in Arabic', (tester) async {
      final repository = FakeAccountRepository();
      await pumpAccount(
        tester,
        repository: repository,
        location: '/account/bookings',
        locale: const Locale('ar'),
      );
      expect(_text('بانتظار موافقتك'), findsOneWidget);
      expect(_text('حجوزاتك'), findsOneWidget);
    });
  });
}
