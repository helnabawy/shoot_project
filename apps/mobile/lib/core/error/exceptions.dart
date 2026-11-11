/// Exceptions are thrown by the data layer (datasources) only. Repositories
/// catch them and return a [Failure] instead, so nothing above the data layer
/// ever sees an exception or a Dio type.
library;

/// One field that failed the server's checks: where (`query.locale`,
/// `body.phone`) and why, as a message key (`api.errors.invalidField`).
typedef FieldProblem = ({String path, String code});

/// The device could not reach the server (offline, DNS, timeout, TLS).
final class NetworkException implements Exception {
  const NetworkException();
}

/// The server answered, but with an error status or a body we can't read.
///
/// [code] is the problem document's message key (`api.errors.notFound`), or
/// `null` when the body was not a problem document. [fields] lists the
/// failed fields of a 422; it is empty otherwise.
final class ServerException implements Exception {
  const ServerException({this.statusCode, this.code, this.fields = const []});

  final int? statusCode;
  final String? code;
  final List<FieldProblem> fields;

  @override
  String toString() => 'ServerException($statusCode, $code, $fields)';
}
