import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/content/cta.dart';
import 'package:shoot_mobile/core/routing/app_routes.dart';
import 'package:shoot_mobile/core/routing/not_found_page.dart';
import 'package:shoot_mobile/features/content/domain/entities/legal.dart';
import 'package:shoot_mobile/features/content/presentation/content_deps.dart';
import 'package:shoot_mobile/features/content/presentation/pages/article_page.dart';
import 'package:shoot_mobile/features/content/presentation/pages/editor_page_screen.dart';
import 'package:shoot_mobile/features/content/presentation/pages/guides_page.dart';
import 'package:shoot_mobile/features/content/presentation/pages/legal_page.dart';
import 'package:shoot_mobile/features/content/presentation/pages/legal_versions_page.dart';
import 'package:shoot_mobile/features/content/presentation/widgets/content_screen.dart';

/// The website's path of a legal document (and the app's): `/terms`, `/terms/professional`,
/// `/privacy`.
String legalPath(LegalKind kind) => switch (kind) {
  LegalKind.terms => '/terms',
  LegalKind.professionalTerms => '/terms/professional',
  LegalKind.privacy => '/privacy',
  LegalKind.unknown => '/terms',
};

/// Guides (33), a guide (34), legal documents (36) and their versions, at the website's paths
/// (contracts/screens.md). The editor-built page route `/{slug}` is [editorPageRoute]: register it
/// after every other route so it never shadows one.
List<RouteBase> contentRoutes(ContentDeps deps) {
  Widget scope(Widget child) =>
      RepositoryProvider<ContentDeps>.value(value: deps, child: child);

  return [
    GoRoute(
      path: '/guides',
      builder: (context, state) => scope(_Guides(state: state)),
    ),
    GoRoute(
      path: '/guides/category/:slug',
      builder: (context, state) =>
          scope(_Guides(state: state, category: state.pathParameters['slug'])),
    ),
    GoRoute(
      path: '/guides/author/:slug',
      builder: (context, state) =>
          scope(_Guides(state: state, author: state.pathParameters['slug'])),
    ),
    GoRoute(
      path: '/guides/:slug',
      builder: (context, state) =>
          scope(_Article(slug: state.pathParameters['slug']!)),
    ),
    for (final kind in [
      LegalKind.terms,
      LegalKind.professionalTerms,
      LegalKind.privacy,
    ]) ...[
      GoRoute(
        path: legalPath(kind),
        builder: (context, state) => scope(_Legal(kind: kind)),
      ),
      GoRoute(
        path: '${legalPath(kind)}/versions',
        builder: (context, state) => scope(_LegalVersions(kind: kind)),
      ),
      GoRoute(
        path: '${legalPath(kind)}/versions/:version',
        builder: (context, state) {
          final version = int.tryParse(state.pathParameters['version'] ?? '');
          return version == null || version < 1
              ? const NotFoundPage()
              : scope(_Legal(kind: kind, version: version));
        },
      ),
    ],
  ];
}

/// `/{slug}`: an editor-built page. Must be registered last.
RouteBase editorPageRoute(ContentDeps deps) => GoRoute(
  path: '/:slug',
  builder: (context, state) => RepositoryProvider<ContentDeps>.value(
    value: deps,
    child: _EditorPage(
      slug: state.pathParameters['slug']!,
      requested: state.uri.path,
    ),
  ),
);

void _backOr(BuildContext context, String fallback) {
  final router = GoRouter.of(context);
  if (router.canPop()) {
    router.pop();
  } else {
    router.go(fallback);
  }
}

class _Guides extends StatelessWidget {
  const _Guides({required this.state, this.category, this.author});

  final GoRouterState state;
  final String? category;
  final String? author;

  @override
  Widget build(BuildContext context) {
    final deps = context.read<ContentDeps>();
    final page = int.tryParse(state.uri.queryParameters['page'] ?? '');
    return ContentScreen(
      loadKey: state.uri.toString(),
      loader: deps.loaders.guides((
        page: page == null || page < 1 ? null : page,
        category: category,
        author: author,
      )),
      builder: (context, guides) => GuidesPage(
        guides: guides,
        onTopic: (slug) =>
            context.go(slug == null ? '/guides' : '/guides/category/$slug'),
        onPage: (n) => context.go(
          Uri(
            path: state.uri.path,
            queryParameters: n > 1 ? {'page': '$n'} : null,
          ).toString(),
        ),
        onGuide: (slug) => unawaited(context.push<void>('/guides/$slug')),
        onFeed: () =>
            unawaited(deps.openUrl(websiteAddress(context, '/guides/feed'))),
        onWhatsapp: () => unawaited(deps.openWhatsapp()),
      ),
    );
  }
}

class _Article extends StatelessWidget {
  const _Article({required this.slug});

  final String slug;

  @override
  Widget build(BuildContext context) {
    final deps = context.read<ContentDeps>();
    return ContentScreen(
      loadKey: slug,
      loader: deps.loaders.article(slug),
      builder: (context, article) => ArticlePage(
        article: article,
        onBack: () => _backOr(context, '/guides'),
        onTopic: (topic) => context.go('/guides/category/$topic'),
        onAuthor: (author) =>
            unawaited(context.push<void>('/guides/author/$author')),
        onGuide: (next) => unawaited(context.push<void>('/guides/$next')),
        onLink: (href) => openContentLink(context, href),
        onWhatsapp: () => unawaited(deps.openWhatsapp()),
      ),
    );
  }
}

class _Legal extends StatelessWidget {
  const _Legal({required this.kind, this.version});

  final LegalKind kind;
  final int? version;

  @override
  Widget build(BuildContext context) {
    final deps = context.read<ContentDeps>();
    return ContentScreen(
      loadKey: '${kind.wire}/${version ?? 'now'}',
      loader: deps.loaders.legal(kind, version: version),
      builder: (context, document) => LegalPage(
        document: document,
        clock: deps.clock,
        onKind: (next) => context.go(legalPath(next)),
        onEarlierVersions: () =>
            unawaited(context.push<void>('${legalPath(kind)}/versions')),
        onLink: (href) => openContentLink(context, href),
        onVersionInForce: () => context.go(legalPath(kind)),
      ),
    );
  }
}

class _LegalVersions extends StatelessWidget {
  const _LegalVersions({required this.kind});

  final LegalKind kind;

  @override
  Widget build(BuildContext context) {
    final deps = context.read<ContentDeps>();
    return ContentScreen(
      loadKey: kind.wire,
      loader: deps.loaders.legalVersions(kind),
      builder: (context, versions) => LegalVersionsPage(
        versions: versions,
        clock: deps.clock,
        onBack: () => _backOr(context, legalPath(kind)),
        onVersion: (entry) => entry.until == null
            ? context.go(legalPath(kind))
            : unawaited(
                context.push<void>(
                  '${legalPath(kind)}/versions/${entry.version}',
                ),
              ),
      ),
    );
  }
}

class _EditorPage extends StatelessWidget {
  const _EditorPage({required this.slug, required this.requested});

  final String slug;
  final String requested;

  @override
  Widget build(BuildContext context) {
    final deps = context.read<ContentDeps>();
    return ContentScreen(
      loadKey: slug,
      loader: deps.loaders.page(slug),
      // A page whose address changed opens from the old one at the new one (US3-S7).
      onLoaded: (context, page) {
        if (page.path != requested) {
          unawaited(GoRouter.of(context).replace<void>(page.path));
        }
      },
      builder: (context, page) => EditorPageScreen(
        page: page,
        onBrief: () => context.go(AppRoutes.home),
        onCta: (cta) => _openCta(context, cta),
        onLink: (href) => openContentLink(context, href),
        onOpenWebsite: () =>
            unawaited(deps.openUrl(websiteAddress(context, page.path))),
      ),
    );
  }

  void _openCta(BuildContext context, Cta cta) {
    final target = cta.path ?? cta.url;
    if (target != null) openContentLink(context, target);
  }
}
