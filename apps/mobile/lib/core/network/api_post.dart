import 'dart:io' show HttpDate, HttpException;

import 'package:dio/dio.dart';
import 'package:shoot_mobile/core/error/exceptions.dart';
import 'package:shoot_mobile/core/network/api_get.dart';
import 'package:shoot_mobile/core/network/api_paths.dart';
import 'package:shoot_mobile/core/network/dio_client.dart';

/// A command's answer: its JSON object (`null` for a 204) and the server's
/// `Date` header (`null` when absent or unreadable), which the sign-in
/// countdowns use to correct for a device clock that is off (feature 009,
/// research R14).
typedef ApiAnswer = ({Map<String, Object?>? body, DateTime? date});

/// `POST {apiV1}/{path}` with a JSON [body], the counterpart of [apiGet] for
/// commands. Throws [NetworkException] when the server cannot be reached and
/// [ServerException] (with `code`, `fields`, `retryAfter`) for an error status
/// or a 2xx other than 204 whose body is not a JSON object.
///
/// [bearer] sends `Authorization: Bearer …` for this call only (the session's
/// own calls, which run on a Dio without the auth interceptor).
Future<ApiAnswer> apiPost(
  Dio dio,
  String path, {
  Map<String, Object?>? body,
  String? bearer,
}) => _send(dio, 'POST', path, body: body, bearer: bearer);

/// `GET` with an explicit [bearer] token; see [apiPost].
Future<ApiAnswer> apiGetWithToken(Dio dio, String path, {String? bearer}) =>
    _send(dio, 'GET', path, bearer: bearer);

Future<ApiAnswer> _send(
  Dio dio,
  String method,
  String path, {
  Map<String, Object?>? body,
  String? bearer,
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
        headers: {'Authorization': ?(bearer == null ? null : 'Bearer $bearer')},
      ),
    );
  } on DioException catch (error) {
    if (isConnectivityError(error)) throw const NetworkException();
    throw serverExceptionFrom(error.response);
  }

  final date = _date(response.headers.value('date'));
  if (response.statusCode == 204) return (body: null, date: date);
  final object = jsonObjectOf(response.data);
  if (object == null) throw ServerException(statusCode: response.statusCode);
  return (body: object, date: date);
}

DateTime? _date(String? header) {
  if (header == null) return null;
  try {
    return HttpDate.parse(header);
  } on FormatException {
    return null;
  } on HttpException {
    return null;
  }
}
