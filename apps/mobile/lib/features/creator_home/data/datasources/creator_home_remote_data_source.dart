import 'package:dio/dio.dart';
import 'package:shoot_mobile/core/network/api_get.dart';
import 'package:shoot_mobile/features/creator_home/data/models/creator_home_model.dart';

/// `/api/mobile/v1/me/creator/home`. Throws through the api helpers; never a Dio type. The answers go
/// through the creator account's and the inbox's own data sources.
abstract interface class CreatorHomeRemoteDataSource {
  Future<CreatorHomeModel> home();
}

final class CreatorHomeRemoteDataSourceImpl
    implements CreatorHomeRemoteDataSource {
  const CreatorHomeRemoteDataSourceImpl(this._dio);

  final Dio _dio;

  @override
  Future<CreatorHomeModel> home() async =>
      CreatorHomeModel.fromJson(await apiGet(_dio, 'me/creator/home'));
}
