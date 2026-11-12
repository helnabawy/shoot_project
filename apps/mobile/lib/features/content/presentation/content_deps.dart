import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/time/clock.dart';
import 'package:shoot_mobile/core/web/website_links.dart';
import 'package:shoot_mobile/features/content/domain/link_target.dart';
import 'package:shoot_mobile/features/content/presentation/cubit/content_loaders.dart';

/// What the content screens need from the outside, provided by the routes (a
/// `RepositoryProvider<ContentDeps>`) so widgets never reach into the service locator.
final class ContentDeps {
  const ContentDeps({
    required this.loaders,
    required this.openWhatsapp,
    required this.links,
    required this.clock,
    this.openUrl = openInBrowser,
  });

  final ContentLoaders loaders;

  /// Opens WhatsApp with the default message (`OpenWhatsApp`); `false` when it cannot.
  final Future<bool> Function() openWhatsapp;

  /// The website's addresses, for links the app does not have and for the feed.
  final WebsiteLinks links;

  /// "Now" for dates that omit the current year.
  final Clock clock;

  /// Opens [Uri] outside the app.
  final UrlOpener openUrl;
}

/// Opens [href] from CMS text: in the app when it has the path, outside it otherwise, nothing when
/// the address is not safe (research R4).
void openContentLink(BuildContext context, String href) {
  final deps = context.read<ContentDeps>();
  final base = deps.links.address('/', languageCode: 'en');
  switch (resolveLink(href, hasAppRoute: appHasRoute, siteBase: base)) {
    case InApp(:final path):
      unawaited(GoRouter.of(context).push<void>(path));
    case External(:final uri):
      unawaited(deps.openUrl(uri));
    case Inert():
      break;
  }
}

/// The website's address of [path] in the app's language.
Uri websiteAddress(BuildContext context, String path) => context
    .read<ContentDeps>()
    .links
    .address(path, languageCode: Localizations.localeOf(context).languageCode);
