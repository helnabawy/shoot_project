import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/usecase/use_case.dart';
import 'package:shoot_mobile/features/content/domain/entities/editor_page.dart';
import 'package:shoot_mobile/features/content/domain/entities/guides.dart';
import 'package:shoot_mobile/features/content/domain/repositories/content_repository.dart';

typedef GuidesParams = ({int? page, String? category, String? author});

/// A page of guides, newest first, optionally narrowed to a topic or an author.
final class GetGuides implements UseCase<GuideList, GuidesParams> {
  const GetGuides(this._repository);

  final ContentRepository _repository;

  @override
  Future<Result<GuideList>> call(GuidesParams params) => _repository.getGuides(
    page: params.page,
    category: params.category,
    author: params.author,
  );
}

/// One guide by its slug.
final class GetArticle implements UseCase<Article, String> {
  const GetArticle(this._repository);

  final ContentRepository _repository;

  @override
  Future<Result<Article>> call(String slug) => _repository.getGuide(slug);
}

/// One editor-built page by its slug.
final class GetPage implements UseCase<EditorPage, String> {
  const GetPage(this._repository);

  final ContentRepository _repository;

  @override
  Future<Result<EditorPage>> call(String slug) => _repository.getPage(slug);
}
