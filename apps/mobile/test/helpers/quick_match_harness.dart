import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/auth/session_cubit.dart';
import 'package:shoot_mobile/core/auth/session_store.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/l10n/locale_cubit.dart';
import 'package:shoot_mobile/core/routing/app_router.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_accent.dart';
import 'package:shoot_mobile/core/web/website_links.dart';
import 'package:shoot_mobile/features/quick_match/presentation/cubit/book_flow_cubit.dart';
import 'package:shoot_mobile/features/quick_match/presentation/cubit/booking_view_cubit.dart';
import 'package:shoot_mobile/features/quick_match/presentation/cubit/match_cubit.dart';
import 'package:shoot_mobile/features/quick_match/presentation/quick_match_routes.dart';
import 'package:shoot_mobile/features/sign_in/domain/usecases/request_code.dart';
import 'package:shoot_mobile/features/sign_in/domain/usecases/verify_code.dart';

import 'auth_fixtures.dart';
import 'in_memory_preferences_store.dart';
import 'quick_match_fixtures.dart';
import 'sign_in_harness.dart';

/// The Quick Match routes as the app wires them, over [repository], at [location].
Future<GoRouter> pumpQuickMatch(
  WidgetTester tester, {
  required MockQuickMatchRepository repository,
  required String location,
  MockAuthRepository? auth,
  bool signedIn = false,
  RecordingOpener? opener,
  Locale locale = const Locale('en'),
}) async {
  // A phone, as the boards: 360 × 780.
  tester.view.physicalSize = const Size(360, 780);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  final prefs = InMemoryPreferencesStore();
  final localeCubit = LocaleCubit(prefs)..select(locale);
  final authRepo = auth ?? MockAuthRepository();
  final session = SessionCubit(
    store: MemorySessionStore(),
    api: MockAuthApi(),
    clock: examplesClock,
    restored: signedIn ? exampleSession(exp: DateTime.utc(2027)) : null,
    storeRead: true,
  );
  final recorder = opener ?? RecordingOpener();
  final links = WebsiteLinks(testConfig, open: recorder.call);
  final flows = QuickMatchFlows(
    (ref, key) => QuickMatchFlow(
      match: MatchCubit(repository: repository, ref: ref, key: key),
      book: BookFlowCubit(
        repository: repository,
        requestCode: RequestCode(authRepo),
        verifyCode: VerifyCode(authRepo),
        session: session,
        clock: examplesClock,
        ref: ref,
        key: key,
      ),
    ),
  );
  final router = createAppRouter(
    initialLocation: location,
    isDebug: false,
    routes: quickMatchRoutes(
      flows: flows,
      createBooking: (ref, key) =>
          BookingViewCubit(repository: repository, ref: ref, key: key),
      links: links,
      openUrl: recorder.call,
    ),
    home: (_) => const Text('home'),
  );
  addTearDown(router.dispose);
  await tester.pumpWidget(
    BlocProvider.value(
      value: localeCubit,
      child: BlocBuilder<LocaleCubit, Locale?>(
        builder: (context, chosen) => MaterialApp.router(
          routerConfig: router,
          locale: chosen,
          theme: AppTheme.of(ShootAccent.brand, Brightness.light),
          supportedLocales: AppLocalizations.supportedLocales,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
        ),
      ),
    ),
  );
  await tester.pump();
  await tester.pump();
  return router;
}
