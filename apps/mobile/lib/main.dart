import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:shoot_mobile/app.dart';
import 'package:shoot_mobile/core/auth/session_cubit.dart';
import 'package:shoot_mobile/core/auth/session_store.dart';
import 'package:shoot_mobile/core/config/app_config.dart';
import 'package:shoot_mobile/core/di/injection.dart';
import 'package:shoot_mobile/core/preferences/shared_preferences_store.dart';
import 'package:shoot_mobile/core/routing/error_page.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  if (kReleaseMode) {
    // Screen 39 instead of a broken widget; debug builds keep Flutter's red screen.
    installErrorPage();
    // Log the kind of failure only: messages can carry personal data.
    FlutterError.onError = (details) =>
        debugPrint('Flutter error: ${details.exception.runtimeType}');
  }
  // Loaded before the first frame so the saved accent, theme and language are
  // applied from the start.
  final store = await SharedPreferencesStore.open();
  // The session is read before the first frame too, so a signed-in person never sees the
  // signed-out state flash (feature 009, OT-US3-S1). The first launch of an install wipes it.
  final sessionStore = SecureSessionStore(store);
  await sessionStore.init();
  final session = await sessionStore.read();
  configureDependencies(
    AppConfig.fromEnvironment(),
    store,
    sessionStore: sessionStore,
    session: session,
  );
  runApp(const ShootApp());
  // Then `GET me` refreshes the user in the background (a 401 signs out).
  unawaited(getIt<SessionCubit>().restore());
}
