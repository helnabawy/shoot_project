import 'package:flutter/widgets.dart';
import 'package:shoot_mobile/app.dart';
import 'package:shoot_mobile/core/config/app_config.dart';
import 'package:shoot_mobile/core/di/injection.dart';
import 'package:shoot_mobile/core/preferences/shared_preferences_store.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Loaded before the first frame so the saved accent, theme and language are
  // applied from the start.
  final store = await SharedPreferencesStore.open();
  configureDependencies(AppConfig.fromEnvironment(), store);
  runApp(const ShootApp());
}
