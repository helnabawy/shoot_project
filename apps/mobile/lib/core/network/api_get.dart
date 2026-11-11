import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:shoot_mobile/core/error/exceptions.dart';
import 'package:shoot_mobile/core/network/api_paths.dart';
import 'package:shoot_mobile/core/network/dio_client.dart';

/// `GET {apiV1}/{path}` and returns the JSON object it answers.
///
/// The one try/catch for API reads, so datasources stay a line long:
/// - no connection or a timeout throws [NetworkException];
/// - an error status throws [ServerException] with the problem document's
///   `code` and `fields` (`code: null` when the body is not a problem);
/// - a 2xx whose body is not a JSON object throws [ServerException].
///
/// [path] is relative to [apiV1] (`site`, `creators/ab12`); a leading slash
/// is accepted. Decoding the object is the caller's job (a `…Model.fromJson`
/// throws `FormatException`, which the repository maps).
Future<Map<String, Object?>> apiGet(
  Dio dio,
  String path, {
  Map<String, Object?>? query,
}) async {
  final relative = path.startsWith('/') ? path.substring(1) : path;
  final Response<Object?> response;
  try {
    response = await dio.get<Object?>(
      '$apiV1/$relative',
      queryParameters: query,
    );
  } on DioException catch (error) {
    if (isConnectivityError(error)) throw const NetworkException();
    throw _fromErrorResponse(error.response);
  }

  final body = _asObject(response.data);
  if (body == null) throw ServerException(statusCode: response.statusCode);
  return body;
}

ServerException _fromErrorResponse(Response<Object?>? response) {
  final status = response?.statusCode;
  final problem = _asObject(response?.data);
  final code = problem?['code'];
  if (problem == null || code is! String) {
    return ServerException(statusCode: status);
  }
  final fields = problem['fields'];
  return ServerException(
    statusCode: status,
    code: code,
    fields: [
      if (fields is List)
        for (final field in fields)
          if (field case {'path': final String path, 'code': final String code})
            (path: path, code: code),
    ],
  );
}

/// The body as a JSON object, decoding text when the server sent it with a
/// content type Dio does not parse; `null` for anything else.
Map<String, Object?>? _asObject(Object? data) {
  if (data is Map) return data.cast<String, Object?>();
  if (data is String && data.isNotEmpty) {
    try {
      final decoded = jsonDecode(data);
      if (decoded is Map) return decoded.cast<String, Object?>();
    } on FormatException {
      return null;
    }
  }
  return null;
}
