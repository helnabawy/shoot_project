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
final class ServerFailure extends Failure {
  const ServerFailure({this.statusCode});

  final int? statusCode;

  @override
  List<Object?> get props => [statusCode];
}

/// Anything we did not anticipate. Logged, never shown verbatim.
final class UnexpectedFailure extends Failure {
  const UnexpectedFailure();
}
