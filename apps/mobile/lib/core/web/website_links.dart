import 'package:shoot_mobile/core/config/app_config.dart';
import 'package:url_launcher/url_launcher.dart';

/// Opens [uri] outside the app; `false` when nothing could open it.
typedef UrlOpener = Future<bool> Function(Uri uri);

/// The system browser (research R17).
Future<bool> openInBrowser(Uri uri) =>
    launchUrl(uri, mode: LaunchMode.externalApplication);

/// Pages of the website the app opens in the browser (research R17): the legal documents a
/// person accepts (until feature 015 builds them in the app) and the email sign-in for editors.
/// Addresses follow the web's `LEGAL_PATHS` and an `/ar` prefix for Arabic.
class WebsiteLinks {
  const WebsiteLinks(this._config, {this._open = openInBrowser});

  final AppConfig _config;
  final UrlOpener _open;

  Uri address(String path, {required String languageCode}) {
    final prefix = languageCode == 'ar' ? '/ar' : '';
    return Uri.parse('${_config.apiBaseUrl}$prefix$path');
  }

  Future<bool> terms(String languageCode) =>
      _open(address('/terms', languageCode: languageCode));

  Future<bool> professionalTerms(String languageCode) =>
      _open(address('/terms/professional', languageCode: languageCode));

  Future<bool> privacy(String languageCode) =>
      _open(address('/privacy', languageCode: languageCode));

  /// The website's email sign-in (009 User Story 5).
  Future<bool> emailSignIn(String languageCode) =>
      _open(address('/login/email', languageCode: languageCode));
}
