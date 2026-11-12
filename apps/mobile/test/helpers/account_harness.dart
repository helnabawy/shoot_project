import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/auth/session_cubit.dart';
import 'package:shoot_mobile/core/auth/session_store.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/l10n/locale_cubit.dart';
import 'package:shoot_mobile/core/routing/app_router.dart';
import 'package:shoot_mobile/core/theme/accent_cubit.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_accent.dart';
import 'package:shoot_mobile/core/theme/theme_mode_cubit.dart';
import 'package:shoot_mobile/features/account/data/models/account_models.dart';
import 'package:shoot_mobile/features/account/domain/entities/account.dart';
import 'package:shoot_mobile/features/account/domain/repositories/account_repository.dart';
import 'package:shoot_mobile/features/account/domain/usecases/account_use_cases.dart';
import 'package:shoot_mobile/features/account/presentation/account_routes.dart';
import 'package:shoot_mobile/features/account/presentation/cubit/account_cubit.dart';
import 'package:shoot_mobile/features/account/presentation/cubit/bookings_cubit.dart';

import 'api_examples.dart';
import 'auth_fixtures.dart';
import 'in_memory_preferences_store.dart';

/// An account repository whose answers a test sets, recording what was asked.
class FakeAccountRepository implements AccountRepository {
  FakeAccountRepository({
    AccountHome? home,
    BookingList? bookings,
    BriefList? briefs,
  }) : home = Ok(home ?? exampleHome()),
       bookings = Ok(bookings ?? exampleBookings()),
       briefs = Ok(briefs ?? exampleBriefs());

  Result<AccountHome> home;
  Result<BookingList> bookings;
  Result<BriefList> briefs;
  Result<void> update = const Ok(null);
  final calls = <String>[];
  final bookingPages = <int>[];

  @override
  Future<Result<AccountHome>> getHome() async {
    calls.add('home');
    return home;
  }

  @override
  Future<Result<BookingList>> getBookings({int page = 1}) async {
    calls.add('bookings');
    bookingPages.add(page);
    return bookings;
  }

  @override
  Future<Result<BriefList>> getBriefs({int page = 1}) async {
    calls.add('briefs');
    return briefs;
  }

  @override
  Future<Result<void>> updateDetails({String? name, String? email}) async {
    calls.add('update name=$name email=$email');
    final result = update;
    if (result is Ok && email != null) {
      // The server would now answer with the email set.
      final current = (home as Ok<AccountHome>).value;
      home = Ok(
        current.copyWith(
          finishItems: [
            for (final i in current.finishItems)
              i.key == FinishKey.email
                  ? FinishItem(key: i.key, done: true, value: email)
                  : i,
          ],
        ),
      );
    }
    return result;
  }

  @override
  Future<Result<void>> markFinishShown() async {
    calls.add('shown');
    // The server remembers: it no longer asks for 25 on its own.
    home = Ok((home as Ok<AccountHome>).value.copyWith(finishAutoOpen: false));
    return const Ok(null);
  }
}

AccountHome exampleHome([String name = 'me-account']) =>
    AccountHomeModel.fromJson(loadExample(name)).toEntity();

BookingList exampleBookings() =>
    BookingListModel.fromJson(loadExample('me-bookings')).toEntity();

BriefList exampleBriefs() =>
    BriefListModel.fromJson(loadExample('me-briefs')).toEntity();

AccountCubit accountCubit(AccountRepository repository) => AccountCubit(
  getHome: GetAccountHome(repository),
  updateDetails: UpdateDetails(repository),
  markFinishShown: MarkFinishShown(repository),
);

BookingsCubit bookingsCubit(AccountRepository repository) => BookingsCubit(
  getBookings: GetBookings(repository),
  getBriefs: GetBriefs(repository),
);

class _MockAuthApi extends MockAuthApi {}

/// The account routes as the app wires them, signed in, at [location].
Future<({GoRouter router, SessionCubit session, MockAuthApi api})> pumpAccount(
  WidgetTester tester, {
  required FakeAccountRepository repository,
  String location = '/account',
  Locale? locale,
  ThemeMode themeMode = ThemeMode.system,
  Widget Function(BuildContext, String)? booking,
}) async {
  await tester.binding.setSurfaceSize(const Size(400, 1400));
  addTearDown(() => tester.binding.setSurfaceSize(null));
  final prefs = InMemoryPreferencesStore();
  final localeCubit = LocaleCubit(prefs)..select(locale);
  final themeCubit = ThemeModeCubit(prefs)..select(themeMode);
  final accentCubit = AccentCubit(prefs);
  final api = _MockAuthApi();
  when(() => api.logout(any())).thenAnswer((_) async {});
  final session = SessionCubit(
    store: MemorySessionStore(),
    api: api,
    clock: examplesClock,
    restored: exampleSession(exp: DateTime.utc(2030)),
    storeRead: true,
  );
  final router = createAppRouter(
    initialLocation: location,
    isDebug: false,
    session: session,
    routes: accountRoutes(
      createAccount: () => accountCubit(repository),
      createBookings: () => bookingsCubit(repository),
      booking: booking,
    ),
    home: (_) => const Text('landing'),
  );
  addTearDown(router.dispose);
  addTearDown(session.close);
  await tester.pumpWidget(
    MultiBlocProvider(
      providers: [
        BlocProvider.value(value: localeCubit),
        BlocProvider.value(value: themeCubit),
        BlocProvider.value(value: accentCubit),
        BlocProvider.value(value: session),
      ],
      child: BlocBuilder<LocaleCubit, Locale?>(
        builder: (context, chosen) => MaterialApp.router(
          routerConfig: router,
          locale: chosen,
          theme: AppTheme.of(ShootAccent.brand, Brightness.light),
          darkTheme: AppTheme.of(ShootAccent.brand, Brightness.dark),
          themeMode: themeMode,
          supportedLocales: AppLocalizations.supportedLocales,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
  return (router: router, session: session, api: api);
}

String locationOf(GoRouter router) =>
    router.routerDelegate.currentConfiguration.uri.toString();
