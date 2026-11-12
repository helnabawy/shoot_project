import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/auth/session_cubit.dart';
import 'package:shoot_mobile/core/auth/session_store.dart';
import 'package:shoot_mobile/core/config/app_config.dart';
import 'package:shoot_mobile/core/content/audience.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/l10n/locale_cubit.dart';
import 'package:shoot_mobile/core/routing/app_router.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_accent.dart';
import 'package:shoot_mobile/core/time/clock.dart';
import 'package:shoot_mobile/core/web/website_links.dart';
import 'package:shoot_mobile/features/sign_in/data/models/otp_models.dart';
import 'package:shoot_mobile/features/sign_in/domain/entities/otp_challenge.dart';
import 'package:shoot_mobile/features/sign_in/domain/repositories/auth_repository.dart';
import 'package:shoot_mobile/features/sign_in/domain/usecases/request_code.dart';
import 'package:shoot_mobile/features/sign_in/domain/usecases/verify_code.dart';
import 'package:shoot_mobile/features/sign_in/presentation/cubit/sign_in_flow_cubit.dart';
import 'package:shoot_mobile/features/sign_in/presentation/sign_in_routes.dart';
import 'package:shoot_mobile/features/site/data/models/audience_model.dart';

import 'api_examples.dart';
import 'auth_fixtures.dart';
import 'in_memory_preferences_store.dart';

class MockAuthRepository extends Mock implements AuthRepository {}

/// The challenge in `auth-challenge.json`.
OtpChallenge exampleChallenge() =>
    OtpChallengeModel.fromJson(loadExample('auth-challenge')).toEntity();

/// The active personas in `personas.json` (or `personas.ar.json`).
List<Persona> examplePersonas({bool arabic = false}) =>
    AudienceModel.fromJson(loadExample(arabic ? 'personas.ar' : 'personas'))
        .toEntity()
        .personas;

/// A flow cubit over [repository] at the examples' time.
SignInFlowCubit flowCubit({
  required AuthRepository repository,
  SignInFlowState initial = const SignInFlowState(),
  Clock? clock,
  SessionCubit? session,
  List<Persona>? personas,
}) => SignInFlowCubit(
  requestCode: RequestCode(repository),
  verifyCode: VerifyCode(repository),
  session:
      session ??
      SessionCubit(
        store: MemorySessionStore(),
        api: MockAuthApi(),
        clock: examplesClock,
        storeRead: true,
      ),
  clock: clock ?? examplesClock,
  loadPersonas: () async => Ok<List<Persona>>(personas ?? examplePersonas()),
  initial: initial,
);

/// Records what the pages ask the website for.
class RecordingOpener {
  final List<Uri> opened = [];

  Future<bool> call(Uri uri) async {
    opened.add(uri);
    return true;
  }
}

const testConfig = AppConfig(
  apiBaseUrl: 'https://shoot.example',
  environment: 'test',
);

/// The sign-in routes as the app wires them, around [cubit], at [location].
Future<GoRouter> pumpSignIn(
  WidgetTester tester, {
  required SignInFlowCubit cubit,
  String location = AppRoutes.login,
  RecordingOpener? opener,
  Locale locale = const Locale('en'),
}) async {
  final prefs = InMemoryPreferencesStore();
  final localeCubit = LocaleCubit(prefs)..select(locale);
  final links = WebsiteLinks(
    testConfig,
    open: (opener ?? RecordingOpener()).call,
  );
  final router = createAppRouter(
    initialLocation: location,
    isDebug: false,
    routes: signInRoutes(createFlow: () => cubit, links: links),
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

String locationOf(GoRouter router) =>
    router.routerDelegate.currentConfiguration.uri.toString();
