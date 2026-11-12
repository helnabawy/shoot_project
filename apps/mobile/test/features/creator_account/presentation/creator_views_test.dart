import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/auth/session.dart';
import 'package:shoot_mobile/core/auth/session_cubit.dart';
import 'package:shoot_mobile/core/auth/session_store.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/routing/app_router.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/time/clock.dart';
import 'package:shoot_mobile/core/widgets/top_hit.dart';
import 'package:shoot_mobile/features/creator_account/domain/entities/creator_account.dart';
import 'package:shoot_mobile/features/creator_account/presentation/creator_account_routes.dart';
import 'package:shoot_mobile/features/creator_account/presentation/cubit/account_cubit.dart';
import 'package:shoot_mobile/features/creator_account/presentation/cubit/availability_cubit.dart';
import 'package:shoot_mobile/features/creator_account/presentation/cubit/bookings_cubit.dart';
import 'package:shoot_mobile/features/creator_account/presentation/cubit/profile_cubit.dart';
import 'package:shoot_mobile/features/creator_account/presentation/pages/account_page.dart';
import 'package:shoot_mobile/features/creator_account/presentation/pages/availability_page.dart';
import 'package:shoot_mobile/features/creator_account/presentation/pages/bookings_page.dart';
import 'package:shoot_mobile/features/creator_account/presentation/pages/profile_page.dart';

import '../../../helpers/auth_fixtures.dart';
import '../../../helpers/pump_app.dart';
import '../fixtures.dart';

void main() {
  late MockCreatorAccountRepository repo;
  final now = DateTime.utc(2026, 11, 12, 10);

  setUp(() {
    repo = MockCreatorAccountRepository();
    registerFallbackValue(DateTime(2026));
  });

  void phone(WidgetTester tester) {
    tester.view.physicalSize = const Size(360, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
  }

  Future<void> settle(WidgetTester tester) =>
      tester.pump(const Duration(seconds: 2));

  group('MW-US3 My account (27)', () {
    Future<void> show(
      WidgetTester tester,
      AccountState state, {
      List<String>? opened,
      Locale locale = const Locale('en'),
    }) async {
      phone(tester);
      await tester.pumpApp(
        AccountView(
          state: state,
          onRetry: () {},
          onOpen: (p) => opened?.add(p),
          onLogOut: () {},
        ),
        locale: locale,
      );
      await settle(tester);
    }

    testWidgets(
      'MW-US3-S1 a draft offers Finish my profile, the missing steps and one primary action',
      (tester) async {
        final opened = <String>[];
        await show(tester, AccountLoaded(accountExample()), opened: opened);
        expect(find.text('Finish my profile'), findsOneWidget);
        expect(find.textContaining('Needs your gender'), findsOneWidget);
        expect(find.byType(TopHit), findsOneWidget);
        await tester.tap(find.text('Finish my profile'));
        expect(opened, ['/account/profile']);
      },
    );

    testWidgets('MW-US3-S3 the rows carry a status from the creator data', (
      tester,
    ) async {
      await show(tester, AccountLoaded(accountExample()));
      expect(find.text('None yet'), findsOneWidget);
      expect(find.text('Draft · 43%'), findsOneWidget);
      expect(find.text('1 day blocked'), findsOneWidget);
      expect(find.text('Only you, until live'), findsOneWidget);
    });

    testWidgets('MW-US3-S2 a waiting request is Up next and opens Bookings', (
      tester,
    ) async {
      final a = accountExample();
      final account = CreatorAccount(
        name: a.name,
        code: a.code,
        professions: a.professions,
        status: ProfileStatus.live,
        strength: 100,
        needs: const [],
        waiting: bookingsExample().waiting.first,
        deliverable: null,
        waitingCount: 1,
        upcomingCount: 0,
        blockedDays: 0,
      );
      final opened = <String>[];
      await show(tester, AccountLoaded(account), opened: opened);
      await tester.tap(find.text('Answer the request'));
      expect(opened, ['/account/bookings']);
    });

    testWidgets('a failed read shows the something-went-wrong screen', (
      tester,
    ) async {
      await show(tester, const AccountFailed(NetworkFailure()));
      expect(find.byType(TopHit), findsOneWidget);
    });

    testWidgets('Arabic reads right to left with the Arabic words', (
      tester,
    ) async {
      await show(
        tester,
        AccountLoaded(accountExample()),
        locale: const Locale('ar'),
      );
      expect(find.text('أكمل ملفي'), findsOneWidget);
    });
  });

  group('MW-US2 Bookings (32)', () {
    BookingsLoaded loaded({CreatorBookings? b}) =>
        BookingsLoaded(bookings: b ?? bookingsExample(), now: now);

    Future<void> show(
      WidgetTester tester,
      BookingsState state, {
      List<String>? log,
      String? only,
    }) async {
      phone(tester);
      await tester.pumpApp(
        BookingsView(
          state: state,
          only: only,
          onRetry: () {},
          onConfirm: (r) => log?.add('confirm $r'),
          onDecline: (r) => log?.add('decline $r'),
          onDeliver: (r) => log?.add('deliver $r'),
          onMarkRead: (r) => log?.add('read $r'),
          onCalendar: () {},
        ),
      );
      await settle(tester);
    }

    testWidgets(
      'MW-US2-S1 the request shows what, when, who and its deadline, with Confirm as the only primary action',
      (tester) async {
        final log = <String>[];
        await show(tester, loaded(), log: log);
        expect(find.text('Wedding, Dubai, 4 hours'), findsWidgets);
        expect(find.textContaining('Answer by'), findsOneWidget);
        expect(find.textContaining('For Layla'), findsWidgets);
        expect(find.textContaining('Quotation Q-2026-0142'), findsOneWidget);
        expect(find.byType(TopHit), findsOneWidget);
        await tester.tap(find.text('Confirm'));
        await tester.tap(find.text('Decline'));
        expect(log, ['confirm B-2026-0142', 'decline B-2026-0142']);
      },
    );

    testWidgets('MW-US2-S8 no phone number is on the screen', (tester) async {
      await show(tester, loaded());
      expect(find.textContaining(RegExp(r'\+?971|05\d{8}')), findsNothing);
    });

    testWidgets('MW-US2-S7 an update can be marked as read', (tester) async {
      final log = <String>[];
      await show(tester, loaded(), log: log);
      expect(find.textContaining('New request for'), findsOneWidget);
      await tester.tap(find.text('Mark as read'));
      expect(log, ['read 7']);
    });

    testWidgets(
      'MW-US2-S4 a lapsed request is not offered and a line says so',
      (tester) async {
        final r = bookingsExample().waiting.first;
        final old = BookingRequest(
          ref: r.ref,
          quotation: r.quotation,
          occasion: r.occasion,
          emirate: r.emirate,
          date: r.date,
          profession: r.profession,
          client: r.client,
          respondBy: now.subtract(const Duration(hours: 1)),
          state: r.state,
          answer: r.answer,
          canDeliver: false,
          paid: false,
        );
        await show(
          tester,
          loaded(
            b: CreatorBookings(
              updates: const [],
              waiting: [old],
              upcoming: const [],
              done: const [],
            ),
          ),
        );
        expect(find.text('Confirm'), findsNothing);
        expect(find.textContaining('This request lapsed.'), findsOneWidget);
      },
    );

    testWidgets(
      'MW-US2-S6 a booking past its shoot day offers Mark as delivered',
      (tester) async {
        final r = bookingsExample().waiting.first;
        final past = BookingRequest(
          ref: 'B-9',
          quotation: null,
          occasion: r.occasion,
          emirate: r.emirate,
          date: r.date,
          profession: r.profession,
          client: r.client,
          respondBy: null,
          state: 'scheduled',
          answer: RequestAnswer.confirmed,
          canDeliver: true,
          paid: true,
        );
        final log = <String>[];
        await show(
          tester,
          loaded(
            b: CreatorBookings(
              updates: const [],
              waiting: const [],
              upcoming: [past],
              done: const [],
            ),
          ),
          log: log,
        );
        expect(find.text('Paid'), findsOneWidget);
        await tester.tap(find.text('Mark as delivered'));
        expect(log, ['deliver B-9']);
      },
    );

    testWidgets(
      'an empty list says requests show when a client picks the creator',
      (tester) async {
        await show(
          tester,
          loaded(
            b: const CreatorBookings(
              updates: [],
              waiting: [],
              upcoming: [],
              done: [],
            ),
          ),
        );
        expect(find.textContaining('No requests yet'), findsOneWidget);
      },
    );

    testWidgets('MW-US2-S3 the decline sheet asks for an optional reason', (
      tester,
    ) async {
      phone(tester);
      String? result = 'unset';
      await tester.pumpApp(
        Builder(
          builder: (context) => TextButton(
            onPressed: () async => result = await showDeclineSheet(context),
            child: const Text('open'),
          ),
        ),
      );
      await tester.tap(find.text('open'));
      await tester.pumpAndSettle();
      expect(find.text('Reason (optional)'), findsOneWidget);
      await tester.enterText(find.byType(TextField), 'Booked elsewhere');
      await tester.tap(find.text('Decline request'));
      await tester.pumpAndSettle();
      expect(result, 'Booked elsewhere');
    });
  });

  group('MW-US4 Availability (31)', () {
    AvailabilityLoaded loaded({
      bool list = false,
      DayNotice? notice,
      Failure? failure,
    }) => AvailabilityLoaded(
      availability: availabilityExample(),
      month: DateTime(2026, 11),
      list: list,
      notice: notice,
      failure: failure,
    );

    Future<void> show(
      WidgetTester tester,
      AvailabilityState state, {
      List<DateTime>? taps,
      List<String>? log,
    }) async {
      phone(tester);
      await tester.pumpApp(
        AvailabilityView(
          state: state,
          onRetry: () {},
          onToggle: (d) => taps?.add(d),
          onPrevious: () => log?.add('prev'),
          onNext: () => log?.add('next'),
          onList: (l) => log?.add('list $l'),
        ),
      );
      await settle(tester);
    }

    testWidgets(
      'MW-US4-S1 shows the month, the legend and the blocked count, and no primary action',
      (tester) async {
        await show(tester, loaded());
        expect(find.text('1 day blocked in the next 90 days'), findsOneWidget);
        expect(find.text('Free'), findsOneWidget);
        expect(find.text('Unavailable'), findsOneWidget);
        expect(find.text('Booked'), findsOneWidget);
        expect(find.byType(TopHit), findsNothing);
      },
    );

    testWidgets('MW-US4-S1 each day is announced with its date and state', (
      tester,
    ) async {
      await show(tester, loaded());
      expect(find.bySemanticsLabel(RegExp(r'unavailable$')), findsOneWidget);
      expect(find.bySemanticsLabel(RegExp(r'booked$')), findsOneWidget);
    });

    testWidgets(
      'MW-US4-S2 a tap on a day reports it; Saved. shows after a save',
      (tester) async {
        final taps = <DateTime>[];
        await show(tester, loaded(notice: DayNotice.saved), taps: taps);
        expect(find.text('Saved.'), findsOneWidget);
        await tester.tap(find.text('25'));
        expect(taps, [DateTime(2026, 11, 25)]);
      },
    );

    testWidgets(
      'MW-US4-S3 and S5 the lines for a booked day and a failed save',
      (tester) async {
        await show(tester, loaded(notice: DayNotice.booked));
        expect(
          find.text('Booked days change only through the booking.'),
          findsOneWidget,
        );
        await show(tester, loaded(failure: const NetworkFailure()));
        expect(find.textContaining("That didn't save"), findsOneWidget);
      },
    );

    testWidgets(
      'MW-US4-S4 the month buttons are named and the first month cannot go back',
      (tester) async {
        final log = <String>[];
        await show(tester, loaded(), log: log);
        expect(find.bySemanticsLabel('Previous month'), findsOneWidget);
        await tester.tap(find.bySemanticsLabel('Next month'));
        expect(log, ['next']);
      },
    );

    testWidgets(
      'MW-US4-S6 See every day as a list shows the days as rows with the same tap',
      (tester) async {
        final log = <String>[];
        final taps = <DateTime>[];
        await show(tester, loaded(), log: log, taps: taps);
        await tester.tap(find.text('See every day as a list'));
        expect(log, ['list true']);
        await show(tester, loaded(list: true), taps: taps);
        await tester.tap(find.text('Free').first);
        expect(taps, isNotEmpty);
        await tester.scrollUntilVisible(
          find.text('Back to the calendar'),
          600,
          scrollable: find.byType(Scrollable).first,
        );
        expect(find.text('Back to the calendar'), findsOneWidget);
      },
    );
  });

  group('MW-US1 My profile (28, 29, 30)', () {
    late ProfileCubit cubit;

    Future<void> show(
      WidgetTester tester,
      String example, {
      List<String>? opened,
      Locale locale = const Locale('en'),
    }) async {
      phone(tester);
      when(() => repo.profile())
          .thenAnswer((_) async => Ok(profileExample(example)));
      cubit = ProfileCubit(repository: repo, picker: FakeFilePicker());
      addTearDown(cubit.close);
      await cubit.load();
      await tester.pumpApp(
        BlocHost(cubit: cubit, onOpen: (p) => opened?.add(p)),
        locale: locale,
      );
      await settle(tester);
    }

    testWidgets(
      'MW-US1-S1 a draft shows the status, code, strength, the attention message and the seven steps',
      (tester) async {
        await show(tester, 'creator-profile-draft');
        expect(find.text('Draft'), findsWidgets);
        expect(find.text('Your code SH-0087'), findsOneWidget);
        expect(find.text('43%'), findsOneWidget);
        expect(find.textContaining("isn't complete"), findsOneWidget);
        expect(find.textContaining('3 steps need attention'), findsOneWidget);
        expect(find.bySemanticsLabel('Profile steps'), findsOneWidget);
        expect(
          find.textContaining('Next: What you do and where'),
          findsOneWidget,
        );
      },
    );

    testWidgets('MW-US1-S2 tabs say what each step needs in words', (
      tester,
    ) async {
      await show(tester, 'creator-profile-draft');
      expect(find.textContaining('Needs your gender'), findsWidgets);
      expect(find.textContaining('Add a photo'), findsWidgets);
      expect(find.textContaining('Needs languages'), findsWidgets);
    });

    testWidgets(
      'MW-US1-S3 the missing field is ringed with a one-line reason',
      (tester) async {
        await show(tester, 'creator-profile-draft');
        expect(find.text('Needed before review'), findsOneWidget); // gender
        await tester.tap(find.text('Next: What you do and where'));
        await tester.pump();
        await tester.pump();
        expect(find.text('Needed before review'), findsWidgets); // languages
      },
    );

    testWidgets(
      'MW-US1-S5 on the last step Send for review is off and names the steps',
      (tester) async {
        await show(tester, 'creator-profile-draft');
        await cubit.goTo(StepKey.identity);
        await tester.pump();
        await tester.scrollUntilVisible(
          find.byType(TopHit),
          300,
          scrollable: find.byType(Scrollable).first,
        );
        final hit = tester.widget<TopHit>(find.byType(TopHit));
        expect(hit.onPressed, isNull);
        expect(
          find.textContaining(
            'Still needed before review',
            skipOffstage: false,
          ),
          findsOneWidget,
        );
      },
    );

    testWidgets(
      'MW-US1-S6 a complete draft shows the list with Send for review as the primary action',
      (tester) async {
        await show(tester, 'creator-profile-ready');
        expect(find.text('Everything we need is here'), findsOneWidget);
        expect(find.textContaining('7. Verify your identity'), findsOneWidget);
        final hit = tester.widget<TopHit>(find.byType(TopHit));
        expect(hit.onPressed, isNotNull);
      },
    );

    testWidgets('MW-US1-S7 sending shows the waiting for review screen', (
      tester,
    ) async {
      await show(tester, 'creator-profile-ready');
      when(
        () => repo.submit(),
      ).thenAnswer((_) async => Ok(profileExample('creator-profile-review')));
      await tester.tap(find.text('Send for review'));
      await settle(tester);
      expect(find.text('Waiting for review'), findsWidgets);
      expect(find.text('Set your calendar'), findsOneWidget);
    });

    testWidgets(
      'MW-US1-S8 a document shows its state and "Waiting for our check"',
      (tester) async {
        await show(tester, 'creator-profile-ready');
        await cubit.goTo(StepKey.identity);
        await tester.pump();
        expect(find.text('Waiting for our check'), findsNWidgets(2));
        expect(find.text('Upload again'), findsNWidgets(2));
      },
    );

    testWidgets(
      'MW-US5-S1 waiting for review shows the date sent, the stages and the rows',
      (tester) async {
        await show(tester, 'creator-profile-review');
        expect(find.textContaining('Sent on'), findsOneWidget);
        expect(find.text('The team checks it'), findsOneWidget);
        expect(find.text('Edit my profile'), findsOneWidget);
        expect(find.text('Changes are checked too.'), findsOneWidget);
        expect(find.byType(TopHit), findsOneWidget);
      },
    );

    testWidgets('MW-US5-S1 Set your calendar opens Availability', (
      tester,
    ) async {
      final opened = <String>[];
      await show(tester, 'creator-profile-review', opened: opened);
      await tester.tap(find.text('Set your calendar'));
      expect(opened, ['/account/availability']);
    });

    testWidgets('MW-US5-S5 Hide my profile asks for confirmation first', (
      tester,
    ) async {
      await show(tester, 'creator-profile-review');
      when(
        () => repo.setHidden(hidden: true),
      ).thenAnswer((_) async => Ok(profileExample('creator-profile-hidden')));
      await tester.tap(find.text('Hide my profile'));
      await tester.pumpAndSettle();
      expect(find.text('Hide your profile?'), findsOneWidget);
      verifyNever(() => repo.setHidden(hidden: true));
      await tester.tap(find.widgetWithText(InkWell, 'Hide my profile').last);
      await tester.pumpAndSettle();
      verify(() => repo.setHidden(hidden: true)).called(1);
    });

    testWidgets(
      'MW-US5-S3 a document that was not accepted shows the team note',
      (tester) async {
        final base = profileExample('creator-profile-draft');
        final rejected = MyProfile(
          code: base.code,
          status: base.status,
          submittedAt: null,
          reviewNote: '',
          strength: 50,
          canSubmit: false,
          hasPendingChanges: false,
          fields: base.fields,
          photo: null,
          samples: const [],
          identity: {
            IdentityKind.emiratesId: IdentityDocument(
              state: IdentityState.rejected,
              uploadedAt: DateTime.utc(2026, 11, 10),
              note: 'Photo is blurry',
            ),
            IdentityKind.tradeLicense: const IdentityDocument(
              state: IdentityState.missing,
              uploadedAt: null,
              note: '',
            ),
          },
          steps: base.steps,
          options: base.options,
          sampleLimit: 12,
          identityBytes: 100,
        );
        when(() => repo.profile()).thenAnswer((_) async => Ok(rejected));
        phone(tester);
        cubit = ProfileCubit(repository: repo, picker: FakeFilePicker());
        addTearDown(cubit.close);
        await cubit.load();
        await cubit.goTo(StepKey.identity);
        await tester.pumpApp(BlocHost(cubit: cubit, onOpen: (_) {}));
        await settle(tester);
        expect(find.text('Not accepted'), findsOneWidget);
        expect(find.textContaining('Photo is blurry'), findsOneWidget);
      },
    );

    testWidgets(
      'MW-US1-S9 a refused save names the step and shows the reason under the field',
      (tester) async {
        await show(tester, 'creator-profile-draft');
        when(() => repo.saveProfile(any())).thenAnswer(
          (_) async => const Err(
            ServerFailure(
              statusCode: 422,
              code: 'api.errors.invalidInput',
              fields: [(path: 'body.gender', code: 'creators.errors.required')],
            ),
          ),
        );
        cubit.edit(
          StepKey.about,
          (cubit.state as ProfileReady).fields.copyWith(nationality: 'EG'),
        );
        await cubit.goTo(StepKey.places);
        await tester.pump();
        expect((cubit.state as ProfileReady).step, StepKey.about);
        expect(find.text('Needed before review.'), findsOneWidget);
      },
    );

    testWidgets('a failed read shows the something-went-wrong screen', (
      tester,
    ) async {
      phone(tester);
      when(() => repo.profile())
          .thenAnswer((_) async => const Err(NetworkFailure()));
      cubit = ProfileCubit(repository: repo, picker: FakeFilePicker());
      addTearDown(cubit.close);
      await cubit.load();
      await tester.pumpApp(BlocHost(cubit: cubit, onOpen: (_) {}));
      await settle(tester);
      expect(find.byType(TopHit), findsOneWidget);
    });
  });

  group('MW-US3-S5 the creator routes', () {
    Future<GoRouter> open(
      WidgetTester tester,
      AccountType type,
      String location,
    ) async {
      final session = SessionCubit(
        store: MemorySessionStore(),
        api: MockAuthApi(),
        clock: examplesClock,
        restored: Session(
          token: 't',
          exp: DateTime.utc(2026, 12, 21),
          user: SessionUser(id: '1', name: 'Omar K.', accountType: type),
        ),
        storeRead: true,
      );
      when(() => repo.account()).thenAnswer((_) async => Ok(accountExample()));
      final router = createAppRouter(
        initialLocation: location,
        isDebug: false,
        session: session,
        routes: creatorAccountRoutes(
          session: session,
          createAccount: () => AccountCubit(repo),
          createProfile: () =>
              ProfileCubit(repository: repo, picker: FakeFilePicker()),
          createBookings: () =>
              BookingsCubit(repository: repo, clock: FixedClock(now)),
          createAvailability: () => AvailabilityCubit(repo),
        ),
        home: (_) => const Text('home'),
      );
      addTearDown(router.dispose);
      phone(tester);
      await tester.pumpWidget(
        MaterialApp.router(
          routerConfig: router,
          theme: AppTheme.light,
          supportedLocales: AppLocalizations.supportedLocales,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
        ),
      );
      await tester.pump(const Duration(seconds: 2));
      return router;
    }

    testWidgets('a creator opens their account', (tester) async {
      await open(tester, AccountType.provider, '/account');
      expect(find.text('Finish my profile'), findsOneWidget);
    });

    testWidgets(
      'a client who opens /account/profile goes home (the client account is feature 013)',
      (tester) async {
        await open(tester, AccountType.seeker, '/account/profile');
        expect(find.text('home'), findsOneWidget);
      },
    );
  });
}

/// Hosts [ProfileView] on a cubit, rebuilding on its states.
class BlocHost extends StatelessWidget {
  const BlocHost({super.key, required this.cubit, required this.onOpen});

  final ProfileCubit cubit;
  final void Function(String) onOpen;

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<ProfileState>(
      stream: cubit.stream,
      initialData: cubit.state,
      builder: (context, snapshot) =>
          ProfileView(state: snapshot.data!, cubit: cubit, onOpen: onOpen),
    );
  }
}
