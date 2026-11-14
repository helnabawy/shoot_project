import 'package:dio/dio.dart';
import 'package:shoot_mobile/core/error/exceptions.dart';
import 'package:shoot_mobile/core/network/api_get.dart';
import 'package:shoot_mobile/features/links/data/models/resolution_model.dart';

/// `GET /api/mobile/v1/resolve?path=`. Throws [NetworkException] or [ServerException] (via
/// `apiGet`), or [FormatException] when the answer does not decode; never a Dio type.
abstract interface class LinksRemoteDataSource {
  Future<ResolutionModel> resolve(String path);
}

final class LinksRemoteDataSourceImpl implements LinksRemoteDataSource {
  const LinksRemoteDataSourceImpl(this._dio);

  final Dio _dio;

  @override
  Future<ResolutionModel> resolve(String path) async =>
      ResolutionModel.fromJson(
        await apiGet(_dio, 'resolve', query: {'path': path}),
      );
}
