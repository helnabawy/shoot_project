import 'package:equatable/equatable.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/usecase/use_case.dart';
import 'package:shoot_mobile/features/site/domain/entities/brief_builder.dart';
import 'package:shoot_mobile/features/site/domain/repositories/site_repository.dart';

/// What screens 17 and 19 need to build and send a brief: the CMS brief builder (sentence, slots
/// and options) and the site's WhatsApp number. A switched-off builder is `builder == null`.
final class BriefContext extends Equatable {
  const BriefContext({required this.builder, required this.whatsappNumber});

  final BriefBuilderConfig? builder;

  /// E.164, or `null` when the site has none.
  final String? whatsappNumber;

  @override
  List<Object?> get props => [builder, whatsappNumber];
}

final class GetBriefContext implements UseCase<BriefContext, NoParams> {
  const GetBriefContext(this._site);

  final SiteRepository _site;

  @override
  Future<Result<BriefContext>> call(NoParams params) async {
    final site = await _site.getSite();
    final builder = await _site.getBriefBuilder();
    return switch ((site, builder)) {
      (Err(:final failure), _) => Err(failure),
      (_, Err(:final failure)) => Err(failure),
      (Ok(value: final s), Ok(value: final b)) => Ok(
        BriefContext(builder: b.builder, whatsappNumber: s.whatsapp.number),
      ),
    };
  }
}

/// The site's WhatsApp number, for the profile's "Ask on WhatsApp".
final class GetWhatsappNumber implements UseCase<String?, NoParams> {
  const GetWhatsappNumber(this._site);

  final SiteRepository _site;

  @override
  Future<Result<String?>> call(NoParams params) async {
    return switch (await _site.getSite()) {
      Ok(:final value) => Ok(value.whatsapp.number),
      Err(:final failure) => Err(failure),
    };
  }
}
