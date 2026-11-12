import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/auth/session_cubit.dart';
import 'package:shoot_mobile/core/di/injection.dart';
import 'package:shoot_mobile/core/first_run/first_run_store.dart';
import 'package:shoot_mobile/core/l10n/app_locales.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/l10n/locale_cubit.dart';
import 'package:shoot_mobile/core/routing/app_router.dart';
import 'package:shoot_mobile/core/theme/accent_cubit.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/theme_mode_cubit.dart';
import 'package:shoot_mobile/core/web/website_links.dart';
import 'package:shoot_mobile/features/quick_match/domain/repositories/quick_match_repository.dart';
import 'package:shoot_mobile/features/quick_match/presentation/cubit/booking_view_cubit.dart';
import 'package:shoot_mobile/features/quick_match/presentation/quick_match_routes.dart';
import 'package:shoot_mobile/features/service_health/presentation/pages/service_health_page.dart';
import 'package:shoot_mobile/features/sign_in/presentation/cubit/sign_in_flow_cubit.dart';
import 'package:shoot_mobile/features/sign_in/presentation/sign_in_routes.dart';

/// The app shell: language, theme and router. No feature logic here.
class ShootApp extends StatefulWidget {
  const ShootApp({super.key});

  @override
  State<ShootApp> createState() => _ShootAppState();
}

class _ShootAppState extends State<ShootApp> with WidgetsBindingObserver {
  final GoRouter _router = createAppRouter(
    onArabicLink: () => getIt<LocaleCubit>().select(AppLocales.arabic),
    welcomeSeen: () => getIt<FirstRunStore>().welcomeSeen,
    session: getIt<SessionCubit>(),
    routes: [
      ...signInRoutes(
        createFlow: getIt.call<SignInFlowCubit>,
        links: getIt<WebsiteLinks>(),
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
    ],
    home: (_) => const ServiceHealthPage(),
  );

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
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
