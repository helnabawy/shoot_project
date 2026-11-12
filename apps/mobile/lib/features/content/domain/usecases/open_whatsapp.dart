import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/usecase/use_case.dart';
import 'package:shoot_mobile/core/web/website_links.dart';
import 'package:shoot_mobile/features/site/domain/entities/site_info.dart';
import 'package:shoot_mobile/features/site/domain/repositories/site_repository.dart';

/// Opens a WhatsApp chat with the business number and the default message, both from Site
/// Settings. `false` when no number is set or nothing could open it.
final class OpenWhatsApp implements UseCase<bool, NoParams> {
  const OpenWhatsApp(this._site, this._open);

  final SiteRepository _site;
  final UrlOpener _open;

  @override
  Future<Result<bool>> call(NoParams params) async {
    final result = await _site.getSite();
    if (result case Err()) return const Ok(false);
    final whatsapp = (result as Ok<SiteInfo>).value.whatsapp;
    final digits = (whatsapp.number ?? '').replaceAll(RegExp(r'\D'), '');
    if (digits.isEmpty) return const Ok(false);
    final message = whatsapp.defaultMessage;
    final text = message == null || message.isEmpty
        ? ''
        : '?text=${Uri.encodeComponent(message)}';
    final uri = Uri.parse('https://wa.me/$digits$text');
    return Ok(await _open(uri));
  }
}
