import 'package:dio/dio.dart';
import 'package:shoot_mobile/core/error/exceptions.dart';
import 'package:shoot_mobile/core/network/api_get.dart';
import 'package:shoot_mobile/features/landing/data/models/landing_model.dart';

/// The landing from `/api/mobile/v1/landing`. Throws [NetworkException] or
/// [ServerException] (via `apiGet`), or [FormatException] when the answer
/// does not decode; never a Dio type.
abstract interface class LandingRemoteDataSource {
  Future<LandingModel> fetchLanding();
}

final class LandingRemoteDataSourceImpl implements LandingRemoteDataSource {
  const LandingRemoteDataSourceImpl(this._dio);

  final Dio _dio;

  @override
  Future<LandingModel> fetchLanding() async =>
      LandingModel.fromJson(await apiGet(_dio, 'landing'));
}
