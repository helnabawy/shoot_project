import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/content/domain/usecases/check_path.dart';

/// What a content screen is showing while it reads one thing from the API.
sealed class ContentState<T> extends Equatable {
  const ContentState();

  @override
  List<Object?> get props => [];
}

final class ContentLoading<T> extends ContentState<T> {
  const ContentLoading();
}

final class ContentLoaded<T> extends ContentState<T> {
  const ContentLoaded(this.value);

  final T value;

  @override
  List<Object?> get props => [value];
}

/// The server answered 404: screen 38 when [removed], else screen 37 (a draft, a page that never
/// was, a guide scheduled for later).
final class ContentMissing<T> extends ContentState<T> {
  const ContentMissing({required this.removed});

  final bool removed;

  @override
  List<Object?> get props => [removed];
}

/// No connection or a server error: screen 39 with "Try again".
final class ContentFailed<T> extends ContentState<T> {
  const ContentFailed(this.failure);

  final Failure failure;

  @override
  List<Object?> get props => [failure];
}

/// One read, ready to run again (Try again, a language change, a new address).
typedef ContentLoader<T> = Future<ContentState<T>> Function();

/// Turns a read's [result] into a state. A 404 asks [isRemoved] about [path] (research R2) unless
/// the thing can never be removed (legal documents), when [isRemoved] is `null`.
Future<ContentState<T>> contentStateOf<T>(
  Result<T> result, {
  required String path,
  IsRemovedPath? isRemoved,
}) async {
  switch (result) {
    case Ok(:final value):
      return ContentLoaded(value);
    case Err(failure: NotFoundFailure()):
      final check = isRemoved == null ? null : await isRemoved(path);
      return ContentMissing(removed: check is Ok<bool> && check.value);
    case Err(:final failure):
      return ContentFailed(failure);
  }
}

/// Runs a [ContentLoader] and holds its outcome. Every open reads again: nothing is cached, so an
/// editor's change shows within the server's 60 seconds (FR-024).
class ContentCubit<T> extends Cubit<ContentState<T>> {
  ContentCubit() : super(ContentLoading<T>());

  ContentLoader<T>? _loader;
  int _generation = 0;

  /// Reads with [loader] and remembers it for [reload].
  Future<void> load(ContentLoader<T> loader) {
    _loader = loader;
    return reload();
  }

  Future<void> reload() async {
    final loader = _loader;
    if (loader == null) return;
    final generation = ++_generation;
    emit(ContentLoading<T>());
    final next = await loader();
    // A newer read (another address, another language) wins.
    if (!isClosed && generation == _generation) emit(next);
  }
}
