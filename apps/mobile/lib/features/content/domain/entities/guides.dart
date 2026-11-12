import 'package:equatable/equatable.dart';
import 'package:shoot_mobile/core/content/pagination.dart';
import 'package:shoot_mobile/core/content/rich_text.dart';
import 'package:shoot_mobile/core/media/image_ref.dart';

/// A guide's category or author as a list row names it.
final class GuideTag extends Equatable {
  const GuideTag({required this.slug, required this.name});

  final String slug;
  final String name;

  @override
  List<Object?> get props => [slug, name];
}

/// A guide in a list (`articleSummaryV1`).
final class ArticleSummary extends Equatable {
  const ArticleSummary({
    required this.slug,
    required this.title,
    required this.summary,
    required this.cover,
    required this.publishedAt,
    required this.readingMinutes,
    required this.categories,
    required this.author,
    required this.inRequestedLanguage,
  });

  final String slug;
  final String title;
  final String summary;
  final ImageRef? cover;

  /// UTC.
  final DateTime publishedAt;
  final int readingMinutes;
  final List<GuideTag> categories;
  final GuideTag? author;

  /// False when the app's language has no text yet and English is shown.
  final bool inRequestedLanguage;

  @override
  List<Object?> get props => [
    slug,
    title,
    summary,
    cover,
    publishedAt,
    readingMinutes,
    categories,
    author,
    inRequestedLanguage,
  ];
}

/// A guide category with its count of live guides.
final class GuideCategory extends Equatable {
  const GuideCategory({
    required this.slug,
    required this.name,
    required this.description,
    required this.count,
  });

  final String slug;
  final String name;
  final String? description;

  /// Live guides in it; 0 for the category a list is narrowed to when the
  /// answer does not count it.
  final int count;

  @override
  List<Object?> get props => [slug, name, description, count];
}

/// The author a list is narrowed to.
final class GuideAuthor extends Equatable {
  const GuideAuthor({
    required this.slug,
    required this.name,
    required this.bio,
    required this.photo,
  });

  final String slug;
  final String name;
  final String? bio;
  final ImageRef? photo;

  @override
  List<Object?> get props => [slug, name, bio, photo];
}

/// A page of guides (`guideListV1`), newest first, with the categories to
/// narrow by and, when narrowed, the [category] or [author].
final class GuideList extends Equatable {
  const GuideList({
    required this.locale,
    required this.items,
    required this.pagination,
    required this.categories,
    required this.category,
    required this.author,
  });

  final String locale;
  final List<ArticleSummary> items;
  final Pagination pagination;
  final List<GuideCategory> categories;
  final GuideCategory? category;
  final GuideAuthor? author;

  @override
  List<Object?> get props => [
    locale,
    items,
    pagination,
    categories,
    category,
    author,
  ];
}

/// One guide (`articleV1`): its summary, body and up to three related guides.
final class Article extends Equatable {
  const Article({
    required this.summary,
    required this.body,
    required this.related,
  });

  final ArticleSummary summary;
  final RichTextDocument body;
  final List<ArticleSummary> related;

  @override
  List<Object?> get props => [summary, body, related];
}
