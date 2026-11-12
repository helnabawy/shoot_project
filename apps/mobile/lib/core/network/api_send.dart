import 'package:dio/dio.dart';
import 'package:shoot_mobile/core/error/exceptions.dart';
import 'package:shoot_mobile/core/network/api_get.dart';
import 'package:shoot_mobile/core/network/api_paths.dart';
import 'package:shoot_mobile/core/network/dio_client.dart';

/// `PATCH`, `PUT` or `DELETE {apiV1}/{path}` with an optional JSON [body], returning the JSON object
/// the server answers (the counterpart of `apiGet` and `apiPost`, same failure rules): no
/// connection is [NetworkException]; an error status or a body that is not an object is
/// [ServerException] with the problem's `code` and `fields`.
Future<Map<String, Object?>> apiSend(
  Dio dio,
  String method,
  String path, {
  Map<String, Object?>? body,
}) async {
  final relative = path.startsWith('/') ? path.substring(1) : path;
  final Response<Object?> response;
  try {
    response = await dio.request<Object?>(
      '$apiV1/$relative',
      data: body,
      options: Options(
        method: method,
        contentType: body == null ? null : Headers.jsonContentType,
      ),
    );
  } on DioException catch (error) {
    if (isConnectivityError(error)) throw const NetworkException();
    throw serverExceptionFrom(error.response);
  }
  final object = jsonObjectOf(response.data);
  if (object == null) throw ServerException(statusCode: response.statusCode);
  return object;
}
