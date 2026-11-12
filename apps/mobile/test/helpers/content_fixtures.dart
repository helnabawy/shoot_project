import 'package:shoot_mobile/core/content/pagination.dart';
import 'package:shoot_mobile/core/content/rich_text.dart';
import 'package:shoot_mobile/core/content/sections.dart';
import 'package:shoot_mobile/features/content/data/models/editor_page_model.dart';
import 'package:shoot_mobile/features/content/data/models/guide_models.dart';
import 'package:shoot_mobile/features/content/data/models/legal_models.dart';
import 'package:shoot_mobile/features/content/domain/entities/editor_page.dart';
import 'package:shoot_mobile/features/content/domain/entities/guides.dart';
import 'package:shoot_mobile/features/content/domain/entities/legal.dart';
import 'package:shoot_mobile/features/site/data/models/site_info_model.dart';
import 'package:shoot_mobile/features/site/domain/entities/site_info.dart';

import 'api_examples.dart';

/// The shared API examples as entities, plus builders for the cases they do not cover.

GuideList exampleGuideList() =>
    GuideListModel.fromJson(loadExample('guides')).toEntity();

Article exampleArticle() =>
    ArticleModel.fromJson(loadExample('guide')).toEntity();

EditorPage examplePage() =>
    EditorPageModel.fromJson(loadExample('page')).toEntity();

LegalDocument exampleLegal() =>
    LegalDocumentModel.fromJson(loadExample('legal')).toEntity();

LegalDocument exampleLegalVersion() =>
    LegalDocumentModel.fromJson(loadExample('legal-version')).toEntity();

LegalVersions exampleLegalVersions() =>
    LegalVersionsModel.fromJson(loadExample('legal-versions')).toEntity();

/// `site.json` with the WhatsApp [number] and [message] replaced (`null` unsets them).
SiteInfo siteInfoWith(
  Map<String, Object?> json, {
  String? number,
  String? message,
}) {
  final copy = Map<String, Object?>.of(json)
    ..['whatsapp'] = {
      'number': number,
      'defaultMessage': message,
      'expectedReplyTime': null,
    };
  return SiteInfoModel.fromJson(copy).toEntity();
}

/// A paragraph of plain text.
ParagraphBlock paragraph(String text) => ParagraphBlock([TextInline(text)]);

/// A level-2 heading.
HeadingBlock heading(String text, {int level = 2}) =>
    HeadingBlock(level: level, children: [TextInline(text)]);

/// A page of the guides list with [items] and [pageCount] pages.
GuideList guideListOf(
  List<ArticleSummary> items, {
  int page = 1,
  int pageCount = 1,
  List<GuideCategory> categories = const [],
  GuideCategory? category,
  GuideAuthor? author,
  String locale = 'en',
}) => GuideList(
  locale: locale,
  items: items,
  pagination: Pagination(
    page: page,
    pageCount: pageCount,
    total: items.length,
    pageSize: 12,
  ),
  categories: categories,
  category: category,
  author: author,
);

/// A guide row.
ArticleSummary summaryOf(
  String slug, {
  String? title,
  String? topic,
  int minutes = 4,
  String? authorName = 'Shoot team',
  bool inRequestedLanguage = true,
}) => ArticleSummary(
  slug: slug,
  title: title ?? slug,
  summary: '',
  cover: null,
  publishedAt: DateTime.utc(2026, 10),
  readingMinutes: minutes,
  categories: [
    if (topic != null) GuideTag(slug: topic.toLowerCase(), name: topic),
  ],
  author: authorName == null
      ? null
      : GuideTag(slug: 'shoot-team', name: authorName),
  inRequestedLanguage: inRequestedLanguage,
);

/// An editor page with [sections].
EditorPage pageOf(String title, List<Section> sections, {String path = '/p'}) =>
    EditorPage(locale: 'en', path: path, title: title, sections: sections);
