import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/links/domain/entities/resolution.dart';

/// Resolves a site path the app's router does not know (008 US5, research R12). The screens that
/// use it arrive with 015.
abstract interface class LinksRepository {
  /// [path] starts with `/`; a leading `/ar` asks for the Arabic answer.
  Future<Result<Resolution>> resolve(String path);
}
