import 'package:dio/dio.dart';
import 'package:shoot_mobile/core/error/exceptions.dart';
import 'package:shoot_mobile/core/network/api_get.dart';
import 'package:shoot_mobile/features/content/data/models/editor_page_model.dart';
import 'package:shoot_mobile/features/content/data/models/guide_models.dart';
import 'package:shoot_mobile/features/content/data/models/legal_models.dart';
import 'package:shoot_mobile/features/content/domain/entities/legal.dart';

/// Guides, editor pages and legal documents from `/api/mobile/v1`. Throws
/// [NetworkException] or [ServerException] (via `apiGet`), or
/// [FormatException] when the answer does not decode; never a Dio type.
abstract interface class ContentRemoteDataSource {
  Future<GuideListModel> fetchGuides({
    int? page,
    String? category,
    String? author,
  });

  Future<ArticleModel> fetchGuide(String slug);

  Future<EditorPageModel> fetchPage(String slug);

  Future<LegalDocumentModel> fetchLegal(LegalKind kind);

  Future<LegalVersionsModel> fetchLegalVersions(LegalKind kind);

  Future<LegalDocumentModel> fetchLegalVersion(LegalKind kind, int version);
}

final class ContentRemoteDataSourceImpl implements ContentRemoteDataSource {
  const ContentRemoteDataSourceImpl(this._dio);

  final Dio _dio;

  /// A slug as one path segment.
  static String _segment(String value) => Uri.encodeComponent(value);

  @override
  Future<GuideListModel> fetchGuides({
    int? page,
    String? category,
    String? author,
  }) async {
    final query = <String, Object?>{
      if (page != null) 'page': '$page',
      'category': ?category,
      'author': ?author,
    };
    return GuideListModel.fromJson(
      await apiGet(_dio, 'guides', query: query.isEmpty ? null : query),
    );
  }

  @override
  Future<ArticleModel> fetchGuide(String slug) async =>
      ArticleModel.fromJson(await apiGet(_dio, 'guides/${_segment(slug)}'));

  @override
  Future<EditorPageModel> fetchPage(String slug) async =>
      EditorPageModel.fromJson(await apiGet(_dio, 'pages/${_segment(slug)}'));

  @override
  Future<LegalDocumentModel> fetchLegal(LegalKind kind) async =>
      LegalDocumentModel.fromJson(await apiGet(_dio, 'legal/${kind.wire}'));

  @override
  Future<LegalVersionsModel> fetchLegalVersions(LegalKind kind) async =>
      LegalVersionsModel.fromJson(
        await apiGet(_dio, 'legal/${kind.wire}/versions'),
      );

  @override
  Future<LegalDocumentModel> fetchLegalVersion(
    LegalKind kind,
    int version,
  ) async => LegalDocumentModel.fromJson(
    await apiGet(_dio, 'legal/${kind.wire}/versions/$version'),
  );
}
