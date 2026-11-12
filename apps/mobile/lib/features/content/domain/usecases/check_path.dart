import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/usecase/use_case.dart';
import 'package:shoot_mobile/features/content/domain/entities/path_status.dart';
import 'package:shoot_mobile/features/content/domain/repositories/path_status_repository.dart';

/// Whether a path that answered 404 was removed (screen 38) rather than never there (screen 37).
/// A failed check is "not removed": the safe default is the not-found screen (FR-031).
final class IsRemovedPath implements UseCase<bool, String> {
  const IsRemovedPath(this._repository);

  final PathStatusRepository _repository;

  @override
  Future<Result<bool>> call(String path) async =>
      switch (await _repository.getStatus(path)) {
        Ok(:final value) => Ok(value == PathStatus.removed),
        Err() => const Ok(false),
      };
}
