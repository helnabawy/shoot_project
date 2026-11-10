import 'package:flutter/widgets.dart';
import 'package:shoot_mobile/app.dart';
import 'package:shoot_mobile/core/config/app_config.dart';
import 'package:shoot_mobile/core/di/injection.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  configureDependencies(AppConfig.fromEnvironment());
  runApp(const ShootApp());
}
