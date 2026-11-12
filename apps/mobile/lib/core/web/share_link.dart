import 'package:share_plus/share_plus.dart';

/// Offers [uri] to the system share sheet (feature 011, FR-013). Injectable so tests and goldens
/// never open one.
typedef ShareLink = Future<void> Function(Uri uri);

/// The system share sheet.
Future<void> shareWithSystemSheet(Uri uri) async {
  await SharePlus.instance.share(ShareParams(uri: uri));
}
