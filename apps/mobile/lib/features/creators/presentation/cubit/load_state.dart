import 'package:equatable/equatable.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';

/// Where a one-request screen stands: loading, done, not found (screen 37) or failed
/// (screen 39).
sealed class LoadState<T> extends Equatable {
  const LoadState();

  @override
  List<Object?> get props => [];

  /// A [Result] as a state: a `NotFoundFailure` is [LoadMissing].
  static LoadState<T> of<T>(Result<T> result) => switch (result) {
    Ok(:final value) => LoadDone(value),
    Err(failure: NotFoundFailure()) => LoadMissing<T>(),
    Err(:final failure) => LoadFailed<T>(failure),
  };
}

final class LoadInProgress<T> extends LoadState<T> {
  const LoadInProgress();
}

final class LoadDone<T> extends LoadState<T> {
  const LoadDone(this.value);

  final T value;

  @override
  List<Object?> get props => [value];
}

final class LoadMissing<T> extends LoadState<T> {
  const LoadMissing();
}

final class LoadFailed<T> extends LoadState<T> {
  const LoadFailed(this.failure);

  final Failure failure;

  @override
  List<Object?> get props => [failure];
}
