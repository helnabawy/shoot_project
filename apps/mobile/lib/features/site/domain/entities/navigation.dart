import 'package:equatable/equatable.dart';
import 'package:shoot_mobile/core/content/links.dart';

/// One footer column: a stable [key] and its CMS [label].
final class FooterGroup extends Equatable {
  const FooterGroup({
    required this.key,
    required this.label,
    required this.links,
  });

  final String key;
  final String label;
  final List<SiteLink> links;

  @override
  List<Object?> get props => [key, label, links];
}

/// The site's menus (`navigationV1`), in [locale].
final class Navigation extends Equatable {
  const Navigation({
    required this.locale,
    required this.header,
    required this.footerGroups,
    required this.legal,
  });

  final String locale;
  final List<SiteLink> header;
  final List<FooterGroup> footerGroups;
  final List<SiteLink> legal;

  @override
  List<Object?> get props => [locale, header, footerGroups, legal];
}
