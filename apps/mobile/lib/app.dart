import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/auth/session.dart';
import 'package:shoot_mobile/core/auth/session_cubit.dart';
import 'package:shoot_mobile/core/di/injection.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/first_run/first_run_store.dart';
import 'package:shoot_mobile/core/l10n/app_locales.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/l10n/locale_cubit.dart';
import 'package:shoot_mobile/core/push/push_ask_sheet.dart';
import 'package:shoot_mobile/core/push/push_cubit.dart';
import 'package:shoot_mobile/core/push/push_service.dart';
import 'package:shoot_mobile/core/routing/app_router.dart';
import 'package:shoot_mobile/core/theme/accent_cubit.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/theme_mode_cubit.dart';
import 'package:shoot_mobile/core/time/clock.dart';
import 'package:shoot_mobile/core/web/website_links.dart';
import 'package:shoot_mobile/features/account/presentation/account_routes.dart';
import 'package:shoot_mobile/features/account/presentation/cubit/account_cubit.dart';
import 'package:shoot_mobile/features/account/presentation/cubit/bookings_cubit.dart';
import 'package:shoot_mobile/features/brief/domain/place.dart';
import 'package:shoot_mobile/features/brief/presentation/brief_cubit.dart';
import 'package:shoot_mobile/features/brief/presentation/brief_routes.dart';
import 'package:shoot_mobile/features/content/presentation/content_deps.dart';
import 'package:shoot_mobile/features/content/presentation/content_routes.dart';
import 'package:shoot_mobile/features/creator_account/domain/repositories/creator_account_repository.dart';
import 'package:shoot_mobile/features/creator_account/presentation/creator_account_routes.dart';
import 'package:shoot_mobile/features/creator_account/presentation/cubit/account_cubit.dart'
    as creator_account;
import 'package:shoot_mobile/features/creator_account/presentation/cubit/availability_cubit.dart';
import 'package:shoot_mobile/features/creator_account/presentation/cubit/bookings_cubit.dart'
    as creator_bookings;
import 'package:shoot_mobile/features/creator_account/presentation/cubit/inbox_cubit.dart';
import 'package:shoot_mobile/features/creator_account/presentation/cubit/profile_cubit.dart';
import 'package:shoot_mobile/features/creator_home/presentation/creator_home_routes.dart';
import 'package:shoot_mobile/features/creator_home/presentation/cubit/creator_home_cubit.dart';
import 'package:shoot_mobile/features/creators/creators_injection.dart';
import 'package:shoot_mobile/features/landing/presentation/landing_cubit.dart';
import 'package:shoot_mobile/features/landing/presentation/landing_page.dart';
import 'package:shoot_mobile/features/menu/menu_routes.dart';
import 'package:shoot_mobile/features/quick_match/domain/repositories/quick_match_repository.dart';
import 'package:shoot_mobile/features/quick_match/presentation/cubit/booking_view_cubit.dart';
import 'package:shoot_mobile/features/quick_match/presentation/quick_match_routes.dart';
import 'package:shoot_mobile/features/sign_in/presentation/cubit/sign_in_flow_cubit.dart';
import 'package:shoot_mobile/features/sign_in/presentation/sign_in_routes.dart';
import 'package:shoot_mobile/features/site/domain/repositories/site_repository.dart';
import 'package:shoot_mobile/features/welcome/presentation/welcome_cubit.dart';
import 'package:shoot_mobile/features/welcome/welcome_routes.dart';

/// The app shell: language, theme and router. No feature logic here.
class ShootApp extends StatefulWidget {
  /// [home] replaces the landing (feature 010); tests use it to exercise the shell.
  const ShootApp({super.key, this.home});

  final WidgetBuilder? home;

  @override
  State<ShootApp> createState() => _ShootAppState();
}

class _ShootAppState extends State<ShootApp> with WidgetsBindingObserver {
  late final GoRouter _router = createAppRouter(
    onArabicLink: () => getIt<LocaleCubit>().select(AppLocales.arabic),
    welcomeSeen: () => getIt<FirstRunStore>().welcomeSeen,
    session: getIt<SessionCubit>(),
    routes: [
      ...signInRoutes(
        createFlow: getIt.call<SignInFlowCubit>,
        links: getIt<WebsiteLinks>(),
      ),
      ...creatorsRoutesFrom(getIt, myCode: _myCreatorCode),
      ...accountRoutes(
        createAccount: getIt.call<AccountCubit>,
        createBookings: getIt.call<BookingsCubit>,
        creator: creatorAccountPages(
          session: getIt<SessionCubit>(),
          createAccount: getIt.call<creator_account.AccountCubit>,
          createBookings: getIt.call<creator_bookings.BookingsCubit>,
          onAccountShown: _askCreatorForPush,
        ),
      ),
      ...contentRoutes(getIt<ContentDeps>()),
      ...creatorAccountRoutes(
        session: getIt<SessionCubit>(),
        createAccount: getIt.call<creator_account.AccountCubit>,
        createProfile: getIt.call<ProfileCubit>,
        createBookings: getIt.call<creator_bookings.BookingsCubit>,
        createAvailability: getIt.call<AvailabilityCubit>,
        createInbox: getIt.call<InboxCubit>,
        onInboxShown: _askCreatorForPush,
        onAccountShown: _askCreatorForPush,
      ),
      ...quickMatchRoutes(
        flows: getIt<QuickMatchFlows>(),
        createBooking: (ref, key) => BookingViewCubit(
          repository: getIt<QuickMatchRepository>(),
          ref: ref,
          key: key,
        ),
        links: getIt<WebsiteLinks>(),
      ),
      // Feature 021: sign-in from the brief ends on `/brief/send`.
      briefSendRoute(getIt<BriefCubit>()),
      // Feature 010: the first visit and the menu.
      welcomeRoute(
        createWelcome: getIt.call<WelcomeCubit>,
        brief: getIt<BriefCubit>(),
      ),
      menuRoute(
        loadSite: getIt<SiteRepository>().getSite,
        links: getIt<WebsiteLinks>(),
        createPush: getIt.call<PushCubit>,
      ),
      // Feature 015's `/{slug}` page route stays last so it never shadows another route.
      editorPageRoute(getIt<ContentDeps>()),
    ],
    // Feature 023: a signed-in creator's `/` is their home (`/?view=client` is the landing).
    creatorHome: widget.home != null
        ? null
        : creatorHomePage(
            session: getIt<SessionCubit>(),
            create: getIt.call<CreatorHomeCubit>,
            clock: getIt<Clock>(),
          ),
    home:
        widget.home ??
        (_) => LandingPage(
          landing: getIt<LandingCubit>(),
          brief: getIt<BriefCubit>(),
          motion: getIt<LandingMotionStore>(),
          clock: getIt<Clock>(),
          links: getIt<WebsiteLinks>(),
          places: getIt<PlaceRepository>(),
          locator: getIt<DeviceLocator>(),
        ),
  );

  final _subscriptions = <StreamSubscription<Object?>>[];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _startPush();
  }

  /// Feature 019: app push. Taps open their page; this device is registered on sign-in and on a
  /// language change, removed before sign-out; a client who reaches step 2 is asked once.
  void _startPush() {
    final push = getIt<PushService>();
    final session = getIt<SessionCubit>()..beforeSignOut = push.unregister;
    unawaited(push.start(open: _router.go));
    _subscriptions
      ..add(
        session.stream.where((s) => s is SignedIn).listen((_) {
          unawaited(push.register());
        }),
      )
      ..add(
        getIt<LocaleCubit>().stream.listen((_) => unawaited(push.register())),
      );
    _router.routerDelegate.addListener(_askOnMatch);
  }

  /// The signed-in creator's own code (null for clients and visitors), so their own profile offers
  /// no booking. Read when a profile opens; a failure shows the profile as to anyone.
  static Future<String?> _myCreatorCode() async {
    final s = getIt<SessionCubit>().state;
    if (s is! SignedIn || s.session.user.accountType != AccountType.provider) {
      return null;
    }
    return switch (await getIt<CreatorAccountRepository>().account()) {
      Ok(:final value) => value.code,
      Err() => null,
    };
  }

  /// A creator is asked once, on their account or inbox, so requests and briefs reach them.
  static void _askCreatorForPush(BuildContext context) => unawaited(
    askForPushOnce(context, getIt<PushService>(), PushAskReason.creatorInbox),
  );

  void _askOnMatch() {
    final path = _router.routerDelegate.currentConfiguration.uri.path;
    if (!path.startsWith('/match/')) return;
    final context = _router.routerDelegate.navigatorKey.currentContext;
    if (context == null) return;
    unawaited(
      askForPushOnce(context, getIt<PushService>(), PushAskReason.clientBrief),
    );
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _router.routerDelegate.removeListener(_askOnMatch);
    for (final s in _subscriptions) {
      unawaited(s.cancel());
    }
    _router.dispose();
    super.dispose();
  }

  // Reduced motion can change while the app runs.
  @override
  void didChangeAccessibilityFeatures() => setState(() {});

  bool get _reduceMotion => WidgetsBinding
      .instance
      .platformDispatcher
      .accessibilityFeatures
      .disableAnimations;

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider<LocaleCubit>.value(value: getIt<LocaleCubit>()),
        BlocProvider<ThemeModeCubit>.value(value: getIt<ThemeModeCubit>()),
        BlocProvider<AccentCubit>.value(value: getIt<AccentCubit>()),
        BlocProvider<SessionCubit>.value(value: getIt<SessionCubit>()),
        BlocProvider<BriefCubit>.value(value: getIt<BriefCubit>()),
      ],
      child: Builder(
        builder: (context) {
          final accent = context.watch<AccentCubit>().state;
          return MaterialApp.router(
            routerConfig: _router,
            debugShowCheckedModeBanner: false,
            onGenerateTitle: (context) => context.l10n.appTitle,
            theme: AppTheme.of(accent, Brightness.light),
            darkTheme: AppTheme.of(accent, Brightness.dark),
            // Recolour without a cross-fade when reduced motion is on.
            themeAnimationDuration: _reduceMotion
                ? Duration.zero
                : kThemeAnimationDuration,
            themeMode: context.watch<ThemeModeCubit>().state,
            // null follows the device; Arabic switches the whole tree to RTL.
            locale: context.watch<LocaleCubit>().state,
            supportedLocales: AppLocales.supported,
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            localeListResolutionCallback: (preferred, _) =>
                AppLocales.resolve(preferred),
            // CSS splits half-leading evenly; so does every text in the app.
            builder: (context, child) => DefaultTextHeightBehavior(
              textHeightBehavior: const TextHeightBehavior(
                leadingDistribution: TextLeadingDistribution.even,
              ),
              child: child!,
            ),
          );
        },
      ),
    );
  }
}
