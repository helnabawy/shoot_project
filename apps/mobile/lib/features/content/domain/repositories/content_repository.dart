import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/content/domain/entities/editor_page.dart';
import 'package:shoot_mobile/features/content/domain/entities/guides.dart';
import 'package:shoot_mobile/features/content/domain/entities/legal.dart';

/// Guides, editor-built pages and legal documents, in the app's current
/// language (sent on every request). An unknown slug, category, author or
/// version is a `NotFoundFailure`.
abstract interface class ContentRepository {
  Future<Result<GuideList>> getGuides({
    int? page,
    String? category,
    String? author,
  });

  Future<Result<Article>> getGuide(String slug);

  Future<Result<EditorPage>> getPage(String slug);

  Future<Result<LegalDocument>> getLegal(LegalKind kind);

  Future<Result<LegalVersions>> getLegalVersions(LegalKind kind);

  Future<Result<LegalDocument>> getLegalVersion(LegalKind kind, int version);
}
