import 'package:dio/dio.dart';
import 'package:shoot_mobile/core/error/exceptions.dart';
import 'package:shoot_mobile/core/network/dio_client.dart';
import 'package:shoot_mobile/features/service_health/data/models/service_health_model.dart';

abstract interface class ServiceHealthRemoteDataSource {
  /// Throws [NetworkException] or [ServerException]; never a Dio type.
  Future<ServiceHealthModel> fetchHealth();
}

final class ServiceHealthRemoteDataSourceImpl
    implements ServiceHealthRemoteDataSource {
  const ServiceHealthRemoteDataSourceImpl(this._dio);

  static const path = '/api/health';

  final Dio _dio;

  @override
  Future<ServiceHealthModel> fetchHealth() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        path,
        // 503 still carries a readable body: the API is up, the database
        // is not. Every other non-200 status is a server error.
        options: Options(validateStatus: (s) => s == 200 || s == 503),
      );
      final body = response.data;
      if (body == null) {
        throw ServerException(statusCode: response.statusCode);
      }
      return ServiceHealthModel.fromJson(body);
    } on DioException catch (error) {
      if (isConnectivityError(error)) throw const NetworkException();
      throw ServerException(statusCode: error.response?.statusCode);
    } on FormatException {
      throw const ServerException();
    }
  }
}
