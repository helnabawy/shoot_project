import 'package:shoot_mobile/core/content/pagination.dart';
import 'package:shoot_mobile/core/content/rich_text.dart';
import 'package:shoot_mobile/core/media/image_ref.dart';
import 'package:shoot_mobile/core/network/json_read.dart';
import 'package:shoot_mobile/features/content/data/models/content_json.dart';
import 'package:shoot_mobile/features/content/domain/entities/guides.dart';

GuideTag _tag(Json json) =>
    GuideTag(slug: readString(json, 'slug'), name: readString(json, 'name'));

/// Decodes `articleSummaryV1`. Throws [FormatException] on a missing or
/// mistyped field.
final class ArticleSummaryModel {
  const ArticleSummaryModel._(this._entity);

  factory ArticleSummaryModel.fromJson(Json json) {
    final author = readNullableObject(json, 'author');
    return ArticleSummaryModel._(
      ArticleSummary(
        slug: readString(json, 'slug'),
        title: readString(json, 'title'),
        summary: readString(json, 'summary'),
        cover: ImageRefModel.readNullable(json, 'cover'),
        publishedAt: readDate(json, 'publishedAt'),
        readingMinutes: readInt(json, 'readingMinutes'),
        categories: List.unmodifiable(
          readList(json, 'categories', (item) => _tag(asObject(item))),
        ),
        author: author == null ? null : _tag(author),
        inRequestedLanguage: readBool(json, 'inRequestedLanguage'),
      ),
    );
  }

  /// A list of `articleSummaryV1` at [key].
  static List<ArticleSummary> readAll(Json json, String key) {
    return List.unmodifiable(
      readList(
        json,
        key,
        (item) => ArticleSummaryModel.fromJson(asObject(item)).toEntity(),
      ),
    );
  }

  final ArticleSummary _entity;

  ArticleSummary toEntity() => _entity;
}

/// Decodes `GET /api/mobile/v1/guides` (`guideListV1`). Throws
/// [FormatException] on a missing or mistyped field.
final class GuideListModel {
  const GuideListModel._(this._entity);

  factory GuideListModel.fromJson(Json json) {
    final categories = List<GuideCategory>.unmodifiable(
      readList(json, 'categories', (item) {
        final c = asObject(item);
        return GuideCategory(
          slug: readString(c, 'slug'),
          name: readString(c, 'name'),
          description: readNullableString(c, 'description'),
          count: readInt(c, 'count'),
        );
      }),
    );
    final category = readNullableObject(json, 'category');
    final author = readNullableObject(json, 'author');
    return GuideListModel._(
      GuideList(
        locale: readString(json, 'locale'),
        items: ArticleSummaryModel.readAll(json, 'items'),
        pagination: PaginationModel.read(json, 'pagination'),
        categories: categories,
        category: category == null ? null : _narrowed(category, categories),
        author: author == null
            ? null
            : GuideAuthor(
                slug: readString(author, 'slug'),
                name: readString(author, 'name'),
                bio: readNullableString(author, 'bio'),
                photo: ImageRefModel.readNullable(author, 'photo'),
              ),
      ),
    );
  }

  /// The category the list is narrowed to, counted from [categories].
  static GuideCategory _narrowed(Json json, List<GuideCategory> categories) {
    final slug = readString(json, 'slug');
    final counted = categories.where((c) => c.slug == slug).firstOrNull;
    return GuideCategory(
      slug: slug,
      name: readString(json, 'name'),
      description: readNullableString(json, 'description'),
      count: counted?.count ?? 0,
    );
  }

  final GuideList _entity;

  GuideList toEntity() => _entity;
}

/// Decodes `GET /api/mobile/v1/guides/{slug}` (`articleV1`). Throws
/// [FormatException] on a missing or mistyped field.
final class ArticleModel {
  const ArticleModel._(this._entity);

  factory ArticleModel.fromJson(Json json) {
    return ArticleModel._(
      Article(
        summary: ArticleSummaryModel.fromJson(json).toEntity(),
        body: RichTextModel.read(json, 'body'),
        related: ArticleSummaryModel.readAll(json, 'related'),
      ),
    );
  }

  final Article _entity;

  Article toEntity() => _entity;
}
