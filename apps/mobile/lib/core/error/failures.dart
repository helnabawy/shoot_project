import 'package:equatable/equatable.dart';

/// What went wrong, as the domain and presentation layers see it.
///
/// A failure carries no user-visible text: the presentation layer maps each
/// type to a localized message (see `failure_message.dart`).
sealed class Failure extends Equatable {
  const Failure();

  @override
  List<Object?> get props => [];
}

/// The device could not reach the server.
final class NetworkFailure extends Failure {
  const NetworkFailure();
}

/// The server answered with an error or an unreadable body.
///
/// [code] is the problem's message key (`api.errors.rateLimited`) or `null`.
final class ServerFailure extends Failure {
  const ServerFailure({this.statusCode, this.code});

  final int? statusCode;
  final String? code;

  @override
  List<Object?> get props => [statusCode, code];
}

/// The thing asked for does not exist or is not public (a 404). Screens show
/// the not-found screen (37) for it.
final class NotFoundFailure extends Failure {
  const NotFoundFailure();
}

/// Anything we did not anticipate. Logged, never shown verbatim.
final class UnexpectedFailure extends Failure {
  const UnexpectedFailure();
}
