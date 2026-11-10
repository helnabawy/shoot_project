import 'package:equatable/equatable.dart';
import 'package:shoot_mobile/core/error/failures.dart';

/// The outcome of a repository call or use case: a value or a [Failure].
///
/// A Dart 3 sealed class rather than a functional-programming package, so
/// callers use `switch` with exhaustiveness checking:
///
/// ```dart
/// switch (result) {
///   case Ok(:final value): ...
///   case Err(:final failure): ...
/// }
/// ```
sealed class Result<T> extends Equatable {
  const Result();

  @override
  bool get stringify => true;
}

final class Ok<T> extends Result<T> {
  const Ok(this.value);

  final T value;

  @override
  List<Object?> get props => [value];
}

final class Err<T> extends Result<T> {
  const Err(this.failure);

  final Failure failure;

  @override
  List<Object?> get props => [failure];
}
