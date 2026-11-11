import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:shoot_mobile/app.dart';
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
  configureDependencies(AppConfig.fromEnvironment(), store);
  runApp(const ShootApp());
}
