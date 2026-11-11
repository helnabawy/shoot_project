import 'package:dio/dio.dart';
import 'package:shoot_mobile/core/error/exceptions.dart';
import 'package:shoot_mobile/core/network/api_get.dart';
import 'package:shoot_mobile/features/site/data/models/audience_model.dart';
import 'package:shoot_mobile/features/site/data/models/brief_builder_model.dart';
import 'package:shoot_mobile/features/site/data/models/navigation_model.dart';
import 'package:shoot_mobile/features/site/data/models/site_info_model.dart';

/// The site basics from `/api/mobile/v1`. Each call throws
/// [NetworkException] or [ServerException] (via `apiGet`), or
/// [FormatException] when the answer does not decode; never a Dio type.
abstract interface class SiteRemoteDataSource {
  Future<SiteInfoModel> fetchSite();

  Future<NavigationModel> fetchNavigation();

  Future<AudienceModel> fetchAudience();

  Future<BriefBuilderModel> fetchBriefBuilder();
}

final class SiteRemoteDataSourceImpl implements SiteRemoteDataSource {
  const SiteRemoteDataSourceImpl(this._dio);

  final Dio _dio;

  @override
  Future<SiteInfoModel> fetchSite() async =>
      SiteInfoModel.fromJson(await apiGet(_dio, 'site'));

  @override
  Future<NavigationModel> fetchNavigation() async =>
      NavigationModel.fromJson(await apiGet(_dio, 'navigation'));

  @override
  Future<AudienceModel> fetchAudience() async =>
      AudienceModel.fromJson(await apiGet(_dio, 'personas'));

  @override
  Future<BriefBuilderModel> fetchBriefBuilder() async =>
      BriefBuilderModel.fromJson(await apiGet(_dio, 'brief-builder'));
}
