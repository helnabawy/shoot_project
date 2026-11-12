import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shoot_mobile/core/auth/session_cubit.dart';
import 'package:shoot_mobile/core/auth/session_store.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/first_run/first_run_store.dart';
import 'package:shoot_mobile/core/time/clock.dart';
import 'package:shoot_mobile/core/web/website_links.dart';
import 'package:shoot_mobile/features/brief/presentation/brief_cubit.dart';
import 'package:shoot_mobile/features/landing/presentation/landing_cubit.dart';
import 'package:shoot_mobile/features/landing/presentation/landing_page.dart';
import 'package:shoot_mobile/features/menu/presentation/menu_page.dart';
import 'package:shoot_mobile/features/welcome/presentation/welcome_cubit.dart';
import 'package:shoot_mobile/features/welcome/presentation/welcome_pages.dart';

import 'auth_fixtures.dart';
import 'golden.dart';
import 'in_memory_preferences_store.dart';
import 'ml_harness.dart';
import 'sign_in_harness.dart';

/// Fixed test content (the shared API examples), never real creators or prices. The Arabic
/// variants use the Arabic brief builder and site examples; the landing example has no Arabic file,
/// so its CMS text stays English there and only the app's own labels change.
SessionCubit _session() => SessionCubit(
  store: MemorySessionStore(),
  api: MockAuthApi(),
  clock: examplesClock,
  storeRead: true,
);

Widget _providers(
  Widget child, {
  required BriefCubit brief,
  WelcomeCubit? welcome,
}) {
  return MultiBlocProvider(
    providers: [
      BlocProvider<SessionCubit>.value(value: _session()),
      BlocProvider<BriefCubit>.value(value: brief),
      if (welcome != null) BlocProvider<WelcomeCubit>.value(value: welcome),
    ],
    child: child,
  );
}

bool _ar(Variant v) => v.locale.languageCode == 'ar';

BriefCubit _brief(Variant v) {
  final c = makeBrief(builder: exampleBuilder(arabic: _ar(v)));
  unawaited(c.load());
  return c;
}

Widget splashScreen(Variant v) =>
    _providers(SplashPage(onDone: () {}), brief: _brief(v));

Widget learnScreen(Variant v, int step) {
  final welcome = WelcomeCubit(
    landing: FakeLandingRepository(Ok(exampleLanding(creators: 2))),
    site: FakeSiteRepository(builder: exampleBuilder(arabic: _ar(v))),
    firstRun: FirstRunStore(InMemoryPreferencesStore()),
  );
  unawaited(welcome.load());
  return _providers(
    LearnStepPage(
      step: step,
      onSkip: () {},
      onNext: () {},
      onBack: () {},
      onStartBrief: () {},
    ),
    brief: _brief(v),
    welcome: welcome,
  );
}

Widget landingScreen(Variant v, {int creators = 5}) {
  final site = FakeSiteRepository(
    site: exampleSite(arabic: _ar(v)),
    builder: exampleBuilder(arabic: _ar(v)),
  );
  final brief = _brief(v);
  return _providers(
    LandingPage(
      landing: LandingCubit(
        landing: FakeLandingRepository(Ok(exampleLanding(creators: creators))),
        site: site,
      ),
      brief: brief,
      motion: LandingMotionStore(InMemoryPreferencesStore()),
      clock: FixedClock(DateTime.utc(2026, 12, 5, 10)),
      links: const WebsiteLinks(testConfig),
    ),
    brief: brief,
  );
}

Widget menuScreen(Variant v) {
  final site = FakeSiteRepository(site: exampleSite(arabic: _ar(v)));
  return _providers(
    MenuPage(
      loadSite: site.getSite,
      links: const WebsiteLinks(testConfig),
      onStartBrief: () {},
    ),
    brief: _brief(v),
  );
}
