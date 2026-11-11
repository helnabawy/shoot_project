import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';

/// A Dio [HttpClientAdapter] that records each request and answers with
/// [respond] (a fixed 200 `{}` by default). [respond] may throw a
/// [DioException] to simulate a timeout or a dropped connection.
class ScriptedAdapter implements HttpClientAdapter {
  ScriptedAdapter([ResponseBody Function(RequestOptions options)? respond])
    : _respond = respond ?? ((_) => ResponseBody.fromString('{}', 200));

  final ResponseBody Function(RequestOptions options) _respond;
  final List<RequestOptions> requests = [];

  RequestOptions? get lastRequest => requests.isEmpty ? null : requests.last;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);
    return _respond(options);
  }

  @override
  void close({bool force = false}) {}
}

/// A JSON answer with [status] and [contentType].
ResponseBody jsonBody(
  Object? body, {
  int status = 200,
  String contentType = 'application/json',
}) {
  return ResponseBody.fromString(
    body is String ? body : jsonEncode(body),
    status,
    headers: {
      Headers.contentTypeHeader: [contentType],
    },
  );
}
