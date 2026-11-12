import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/content/domain/entities/path_status.dart';

/// Classifies a site path through `GET /api/mobile/v1/resolve?path=` (008 US5), reading only its
/// `status`. [path] has no language prefix; the request's language is the app's.
abstract interface class PathStatusRepository {
  Future<Result<PathStatus>> getStatus(String path);
}
