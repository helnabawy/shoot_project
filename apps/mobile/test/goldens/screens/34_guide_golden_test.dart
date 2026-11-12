// The plan names screen goldens by board number (`<id>_<name>_golden_test.dart`).
// ignore_for_file: file_names
@Tags(['golden'])
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/features/content/domain/entities/guides.dart';
import 'package:shoot_mobile/features/content/presentation/pages/article_page.dart';

import '../../helpers/board_content.dart';
import '../../helpers/content_golden.dart';
import '../../helpers/golden.dart';

Widget _screen(Article article) => ArticlePage(
  article: article,
  onBack: () {},
  onTopic: (_) {},
  onAuthor: (_) {},
  onGuide: (_) {},
  onLink: (_) {},
  onWhatsapp: () {},
);

void main() {
  for (final variant in Variant.values) {
    testWidgets(
      'MG-US2-S4 screen 34 renders to its board in ${variant.id}',
      (tester) => pumpBoard(
        tester,
        id: '34',
        variant: variant,
        child: _screen(
          boardArticle(arabic: variant.locale.languageCode == 'ar'),
        ),
      ),
      skip: !goldensEnabled,
    );
  }

  testWidgets(
    'screen 34 self-baselines: no overflow at 393, 430, iPad and text scale 2',
    (tester) => pumpSelfBaselines(
      tester,
      id: '34',
      child: _screen(boardArticle(arabic: false)),
    ),
    skip: !goldensEnabled,
  );

  testWidgets(
    'MG-US2-S6 screen 34 in Arabic with English text and its notice (no board)',
    (tester) {
      final article = boardArticle(arabic: false);
      final summary = article.summary;
      return pumpContentState(
        tester,
        name: '34-english-in-arabic',
        variant: Variant.arLight,
        size: const Size(360, 1400),
        child: _screen(
          Article(
            summary: ArticleSummary(
              slug: summary.slug,
              title: summary.title,
              summary: summary.summary,
              cover: null,
              publishedAt: summary.publishedAt,
              readingMinutes: summary.readingMinutes,
              categories: summary.categories,
              author: summary.author,
              inRequestedLanguage: false,
            ),
            body: article.body,
            related: article.related,
          ),
        ),
      );
    },
    skip: !goldensEnabled,
  );
}
