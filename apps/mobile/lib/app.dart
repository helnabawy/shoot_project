import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/di/injection.dart';
import 'package:shoot_mobile/core/l10n/app_locales.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/l10n/locale_cubit.dart';
import 'package:shoot_mobile/core/routing/app_router.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/theme_mode_cubit.dart';

/// The app shell: language, theme and router. No feature logic here.
class ShootApp extends StatefulWidget {
  const ShootApp({super.key});

  @override
  State<ShootApp> createState() => _ShootAppState();
}

class _ShootAppState extends State<ShootApp> {
  final GoRouter _router = createAppRouter();

  @override
  void dispose() {
    _router.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider<LocaleCubit>.value(value: getIt<LocaleCubit>()),
        BlocProvider<ThemeModeCubit>.value(value: getIt<ThemeModeCubit>()),
      ],
      child: Builder(
        builder: (context) {
          return MaterialApp.router(
            routerConfig: _router,
            debugShowCheckedModeBanner: false,
            onGenerateTitle: (context) => context.l10n.appTitle,
            theme: AppTheme.light,
            darkTheme: AppTheme.dark,
            themeMode: context.watch<ThemeModeCubit>().state,
            // null follows the device; Arabic switches the whole tree to RTL.
            locale: context.watch<LocaleCubit>().state,
            supportedLocales: AppLocales.supported,
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            localeListResolutionCallback: (preferred, _) =>
                AppLocales.resolve(preferred),
          );
        },
      ),
    );
  }
}
