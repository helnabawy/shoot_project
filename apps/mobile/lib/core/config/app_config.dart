import 'package:equatable/equatable.dart';

/// Build-time configuration, read from `--dart-define` (or
/// `--dart-define-from-file=config/<env>.json`). Never put secrets here: a
/// mobile binary can be unpacked, so anything compiled in is public.
final class AppConfig extends Equatable {
  const AppConfig({required this.apiBaseUrl, required this.environment});

  /// Reads the values passed to `flutter run` / `flutter build`.
  factory AppConfig.fromEnvironment() {
    return const AppConfig(
      apiBaseUrl: String.fromEnvironment(
        'API_BASE_URL',
        defaultValue: 'http://localhost:3000',
      ),
      environment: String.fromEnvironment(
        'APP_ENV',
        defaultValue: 'development',
      ),
    );
  }

  /// Origin of the web app (Next.js + Payload). REST lives under `/api`.
  final String apiBaseUrl;

  /// `development`, `staging` or `production`.
  final String environment;

  bool get isProduction => environment == 'production';

  @override
  List<Object?> get props => [apiBaseUrl, environment];
}
