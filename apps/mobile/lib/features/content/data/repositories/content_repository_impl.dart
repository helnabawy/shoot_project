import 'package:shoot_mobile/core/error/api_result.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/content/data/datasources/content_remote_data_source.dart';
import 'package:shoot_mobile/features/content/domain/entities/editor_page.dart';
import 'package:shoot_mobile/features/content/domain/entities/guides.dart';
import 'package:shoot_mobile/features/content/domain/entities/legal.dart';
import 'package:shoot_mobile/features/content/domain/repositories/content_repository.dart';

/// Turns datasource exceptions into failures (see [apiResult]) and models
/// into entities.
final class ContentRepositoryImpl implements ContentRepository {
  const ContentRepositoryImpl(this._remote);

  final ContentRemoteDataSource _remote;

  @override
  Future<Result<GuideList>> getGuides({
    int? page,
    String? category,
    String? author,
  }) => apiResult(
    () async => (await _remote.fetchGuides(
      page: page,
      category: category,
      author: author,
    )).toEntity(),
  );

  @override
  Future<Result<Article>> getGuide(String slug) =>
      apiResult(() async => (await _remote.fetchGuide(slug)).toEntity());

  @override
  Future<Result<EditorPage>> getPage(String slug) =>
      apiResult(() async => (await _remote.fetchPage(slug)).toEntity());

  @override
  Future<Result<LegalDocument>> getLegal(LegalKind kind) =>
      apiResult(() async => (await _remote.fetchLegal(kind)).toEntity());

  @override
  Future<Result<LegalVersions>> getLegalVersions(LegalKind kind) => apiResult(
    () async => (await _remote.fetchLegalVersions(kind)).toEntity(),
  );

  @override
  Future<Result<LegalDocument>> getLegalVersion(LegalKind kind, int version) =>
      apiResult(
        () async => (await _remote.fetchLegalVersion(kind, version)).toEntity(),
      );
}
