import 'package:equatable/equatable.dart';
import 'package:shoot_mobile/core/content/creator_card.dart';
import 'package:shoot_mobile/core/content/links.dart';
import 'package:shoot_mobile/core/content/pagination.dart';
import 'package:shoot_mobile/core/content/sections.dart';
import 'package:shoot_mobile/core/media/image_ref.dart';
import 'package:shoot_mobile/features/site/domain/entities/brief_builder.dart';

/// A directory filter group; a key this build does not know is [unknown].
enum FilterKey { type, specialty, place, unknown }

final class FilterOption extends Equatable {
  const FilterOption({
    required this.slug,
    required this.name,
    required this.count,
    required this.selected,
  });

  final String slug;
  final String name;

  /// Creators with this option, the other filters applied.
  final int count;
  final bool selected;

  @override
  List<Object?> get props => [slug, name, count, selected];
}

final class DirectoryFilter extends Equatable {
  const DirectoryFilter({
    required this.key,
    required this.label,
    required this.options,
  });

  final FilterKey key;

  /// The group's name in the answer's language ("Specialty").
  final String label;
  final List<FilterOption> options;

  @override
  List<Object?> get props => [key, label, options];
}

/// The directory (`creatorListV1`): the website's order and counts.
final class CreatorList extends Equatable {
  const CreatorList({
    required this.locale,
    required this.items,
    required this.filters,
    required this.pagination,
  });

  final String locale;
  final List<CreatorCard> items;
  final List<DirectoryFilter> filters;
  final Pagination pagination;

  @override
  List<Object?> get props => [locale, items, filters, pagination];
}

/// What a directory request narrows by: slugs, as on the website.
final class CreatorQuery extends Equatable {
  const CreatorQuery({this.type, this.specialty, this.place, this.page});

  final String? type;
  final String? specialty;
  final String? place;

  /// From 1; `null` is the first page.
  final int? page;

  @override
  List<Object?> get props => [type, specialty, place, page];
}

enum SampleKind { image, video, unknown }

/// One piece of work on a profile.
final class Sample extends Equatable {
  const Sample({
    required this.id,
    required this.kind,
    required this.thumb,
    required this.large,
    required this.alt,
    required this.caption,
    required this.specialty,
    required this.videoUrl,
    required this.provider,
  });

  final String id;
  final SampleKind kind;

  /// The grid picture (sizes up to the card size).
  final ImageRef thumb;

  /// The viewer picture (every size).
  final ImageRef large;
  final String alt;
  final String caption;

  /// The specialty's name, or "".
  final String specialty;

  /// Videos only: where it plays, and on which site ("YouTube").
  final String? videoUrl;
  final String? provider;

  @override
  List<Object?> get props => [
    id,
    kind,
    thumb,
    large,
    alt,
    caption,
    specialty,
    videoUrl,
    provider,
  ];
}

/// A public creator's profile (`creatorProfileV1`).
final class CreatorProfile extends Equatable {
  const CreatorProfile({
    required this.locale,
    required this.code,
    required this.displayCode,
    required this.name,
    required this.initials,
    required this.bio,
    required this.photo,
    required this.types,
    required this.places,
    required this.specialties,
    required this.languages,
    required this.nationality,
    required this.yearsExperience,
    required this.samples,
    required this.social,
    required this.canBook,
    required this.personaSlugs,
  });

  final String locale;
  final String code;
  final String displayCode;
  final String name;
  final String initials;
  final String bio;
  final ImageRef? photo;
  final String types;
  final List<String> places;
  final List<String> specialties;
  final List<String> languages;
  final String? nationality;
  final int? yearsExperience;
  final List<Sample> samples;

  /// `label` is the platform.
  final List<ExternalLink> social;

  /// False when none of the creator's types is offered on the site.
  final bool canBook;

  /// The creator's types the site offers (the booking's allowed types).
  final List<String> personaSlugs;

  @override
  List<Object?> get props => [
    locale,
    code,
    displayCode,
    name,
    initials,
    bio,
    photo,
    types,
    places,
    specialties,
    languages,
    nationality,
    yearsExperience,
    samples,
    social,
    canBook,
    personaSlugs,
  ];
}

/// A sample on a specialty page, with who shot it.
final class SpecialtySample extends Equatable {
  const SpecialtySample({
    required this.id,
    required this.creatorCode,
    required this.creatorName,
    required this.thumb,
    required this.alt,
    required this.caption,
    required this.kind,
  });

  final String id;

  /// What `creators/{code}` takes.
  final String creatorCode;
  final String creatorName;
  final ImageRef thumb;
  final String alt;
  final String caption;
  final SampleKind kind;

  @override
  List<Object?> get props => [
    id,
    creatorCode,
    creatorName,
    thumb,
    alt,
    caption,
    kind,
  ];
}

/// `/work/{specialty}` (`specialtyPageV1`).
final class SpecialtyPage extends Equatable {
  const SpecialtyPage({
    required this.locale,
    required this.categoryId,
    required this.slug,
    required this.name,
    required this.title,
    required this.description,
    required this.intro,
    required this.sampleCount,
    required this.professionalCount,
    required this.creators,
    required this.samples,
  });

  final String locale;
  final String categoryId;
  final String slug;
  final String name;

  /// The editor's text; "" when none was written.
  final String title;
  final String description;
  final String intro;
  final int sampleCount;
  final int professionalCount;
  final List<CreatorCard> creators;
  final List<SpecialtySample> samples;

  @override
  List<Object?> get props => [
    locale,
    categoryId,
    slug,
    name,
    title,
    description,
    intro,
    sampleCount,
    professionalCount,
    creators,
    samples,
  ];
}

/// A hire page (`hirePageV1`). When [path] differs from the address asked
/// for, the app replaces its location.
final class HirePage extends Equatable {
  const HirePage({
    required this.locale,
    required this.path,
    required this.title,
    required this.intro,
    required this.sections,
    required this.builder,
    required this.preset,
    required this.creators,
    required this.creatorTotal,
    required this.faq,
  });

  final String locale;
  final String path;
  final String title;
  final String? intro;
  final List<Section> sections;

  /// `null` when the brief builder is off.
  final BriefBuilderConfig? builder;

  /// Slot token to preset option value.
  final Map<String, String> preset;

  /// At most six.
  final List<CreatorCard> creators;
  final int creatorTotal;
  final List<FaqItem> faq;

  @override
  List<Object?> get props => [
    locale,
    path,
    title,
    intro,
    sections,
    builder,
    preset,
    creators,
    creatorTotal,
    faq,
  ];
}
