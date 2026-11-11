import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/site/domain/entities/audience.dart';
import 'package:shoot_mobile/features/site/domain/entities/brief_builder.dart';
import 'package:shoot_mobile/features/site/domain/entities/navigation.dart';
import 'package:shoot_mobile/features/site/domain/entities/site_info.dart';

/// The site basics, in the app's current language (sent on every request).
abstract interface class SiteRepository {
  Future<Result<SiteInfo>> getSite();

  Future<Result<Navigation>> getNavigation();

  Future<Result<Audience>> getAudience();

  Future<Result<BriefBuilder>> getBriefBuilder();
}
