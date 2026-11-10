import 'package:shoot_mobile/core/error/result.dart';

/// One application action. Presentation calls use cases, never repositories.
///
/// [P] is the parameter type; use [NoParams] when there is none.
abstract interface class UseCase<T, P> {
  Future<Result<T>> call(P params);
}

/// Parameter for a use case that takes no input.
final class NoParams {
  const NoParams();
}
