import 'package:shoot_mobile/features/content/domain/entities/editor_page.dart';
import 'package:shoot_mobile/features/content/domain/entities/guides.dart';
import 'package:shoot_mobile/features/content/domain/entities/legal.dart';
import 'package:shoot_mobile/features/content/domain/usecases/check_path.dart';
import 'package:shoot_mobile/features/content/domain/usecases/get_guides.dart';
import 'package:shoot_mobile/features/content/domain/usecases/get_legal.dart';
import 'package:shoot_mobile/features/content/presentation/cubit/content_state.dart';

/// The reads of the five screens, as [ContentLoader]s over the use cases.
final class ContentLoaders {
  const ContentLoaders({
    required this.getGuides,
    required this.getArticle,
    required this.getPage,
    required this.getLegal,
    required this.getLegalVersion,
    required this.getLegalVersions,
    required this.isRemoved,
  });

  final GetGuides getGuides;
  final GetArticle getArticle;
  final GetPage getPage;
  final GetLegal getLegal;
  final GetLegalVersion getLegalVersion;
  final GetLegalVersions getLegalVersions;
  final IsRemovedPath isRemoved;

  ContentLoader<GuideList> guides(GuidesParams params) =>
      () async => contentStateOf(await getGuides(params), path: '/guides');

  ContentLoader<Article> article(String slug) =>
      () async => contentStateOf(
        await getArticle(slug),
        path: '/guides/$slug',
        isRemoved: isRemoved,
      );

  ContentLoader<EditorPage> page(String slug) =>
      () async => contentStateOf(
        await getPage(slug),
        path: '/$slug',
        isRemoved: isRemoved,
      );

  /// The version in force, or [version] when given.
  ContentLoader<LegalDocument> legal(LegalKind kind, {int? version}) =>
      () async => contentStateOf(
        version == null
            ? await getLegal(kind)
            : await getLegalVersion((kind: kind, version: version)),
        path: '/${kind.wire}',
      );

  ContentLoader<LegalVersions> legalVersions(LegalKind kind) =>
      () async =>
          contentStateOf(await getLegalVersions(kind), path: '/${kind.wire}');
}
