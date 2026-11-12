import 'package:dio/dio.dart';
import 'package:shoot_mobile/core/network/api_get.dart';
import 'package:shoot_mobile/core/network/json_read.dart';

/// `GET resolve?path=`. Throws `NetworkException` or `ServerException` (via `apiGet`), or
/// [FormatException] when the answer has no `status`.
abstract interface class PathStatusRemoteDataSource {
  Future<String> fetchStatus(String path);
}

final class PathStatusRemoteDataSourceImpl
    implements PathStatusRemoteDataSource {
  const PathStatusRemoteDataSourceImpl(this._dio);

  final Dio _dio;

  @override
  Future<String> fetchStatus(String path) async => readString(
    await apiGet(_dio, 'resolve', query: {'path': path}),
    'status',
  );
}
