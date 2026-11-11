import 'package:shoot_mobile/core/error/api_result.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/site/data/datasources/site_remote_data_source.dart';
import 'package:shoot_mobile/features/site/domain/entities/audience.dart';
import 'package:shoot_mobile/features/site/domain/entities/brief_builder.dart';
import 'package:shoot_mobile/features/site/domain/entities/navigation.dart';
import 'package:shoot_mobile/features/site/domain/entities/site_info.dart';
import 'package:shoot_mobile/features/site/domain/repositories/site_repository.dart';

/// Turns datasource exceptions into failures (see [apiResult]) and models
/// into entities.
final class SiteRepositoryImpl implements SiteRepository {
  const SiteRepositoryImpl(this._remote);

  final SiteRemoteDataSource _remote;

  @override
  Future<Result<SiteInfo>> getSite() =>
      apiResult(() async => (await _remote.fetchSite()).toEntity());

  @override
  Future<Result<Navigation>> getNavigation() =>
      apiResult(() async => (await _remote.fetchNavigation()).toEntity());

  @override
  Future<Result<Audience>> getAudience() =>
      apiResult(() async => (await _remote.fetchAudience()).toEntity());

  @override
  Future<Result<BriefBuilder>> getBriefBuilder() =>
      apiResult(() async => (await _remote.fetchBriefBuilder()).toEntity());
}
