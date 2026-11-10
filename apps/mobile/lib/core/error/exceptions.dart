/// Exceptions are thrown by the data layer (datasources) only. Repositories
/// catch them and return a [Failure] instead, so nothing above the data layer
/// ever sees an exception or a Dio type.
library;

/// The device could not reach the server (offline, DNS, timeout, TLS).
final class NetworkException implements Exception {
  const NetworkException();
}

/// The server answered, but with an error status or a body we can't read.
final class ServerException implements Exception {
  const ServerException({this.statusCode});

  final int? statusCode;
}
