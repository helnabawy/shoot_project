/// Landing and editor-page sections as the API sends them (`sectionV1`),
/// resolved the way the website renders them. A section type this build does
/// not know decodes to [UnknownSection], which screens skip.
library;

import 'package:equatable/equatable.dart';
import 'package:shoot_mobile/core/content/audience.dart';
import 'package:shoot_mobile/core/content/creator_card.dart';
import 'package:shoot_mobile/core/content/cta.dart';
import 'package:shoot_mobile/core/content/rich_text.dart';
import 'package:shoot_mobile/core/media/image_ref.dart';
import 'package:shoot_mobile/core/network/json_read.dart';

/// One section. [anchor] is its in-page target, or `null`.
sealed class Section extends Equatable {
  const Section({required this.anchor});

  final String? anchor;
}

/// The small drawing beside a how-it-works step.
enum StepVisual { none, brief, match, work, unknown }

final class HowItWorksStep extends Equatable {
  const HowItWorksStep({
    required this.title,
    required this.body,
    required this.visual,
  });

  final String title;
  final String? body;
  final StepVisual visual;

  @override
  List<Object?> get props => [title, body, visual];
}

final class HowItWorksSection extends Section {
  const HowItWorksSection({
    required super.anchor,
    required this.heading,
    required this.subheading,
    required this.steps,
    required this.cta,
  });

  final String heading;
  final String? subheading;
  final List<HowItWorksStep> steps;
  final Cta? cta;

  @override
  List<Object?> get props => [anchor, heading, subheading, steps, cta];
}

/// Which part of the brief builder a feature points at.
enum FeaturePointsAt { none, sentence, language, send, whatsapp, unknown }

final class FeatureItem extends Equatable {
  const FeatureItem({
    required this.title,
    required this.body,
    required this.glyph,
    required this.pointsAt,
  });

  final String title;
  final String? body;
  final String? glyph;
  final FeaturePointsAt pointsAt;

  @override
  List<Object?> get props => [title, body, glyph, pointsAt];
}

final class FeaturesSection extends Section {
  const FeaturesSection({
    required super.anchor,
    required this.heading,
    required this.subheading,
    required this.items,
  });

  final String heading;
  final String? subheading;
  final List<FeatureItem> items;

  @override
  List<Object?> get props => [anchor, heading, subheading, items];
}

final class CategoryTile extends Equatable {
  const CategoryTile({
    required this.category,
    required this.samples,
    required this.professionals,
    required this.hasPage,
  });

  final Category category;
  final int samples;
  final int professionals;

  /// False for a hand-picked specialty outside the audience: it has no
  /// `/work/{slug}` page.
  final bool hasPage;

  @override
  List<Object?> get props => [category, samples, professionals, hasPage];
}

final class CategoriesGridSection extends Section {
  const CategoriesGridSection({
    required super.anchor,
    required this.heading,
    required this.subheading,
    required this.tiles,
    required this.cta,
  });

  final String heading;
  final String? subheading;
  final List<CategoryTile> tiles;
  final Cta? cta;

  @override
  List<Object?> get props => [anchor, heading, subheading, tiles, cta];
}

enum PersonaBandLayout { combined, perPersona, unknown }

final class PersonaBandSection extends Section {
  const PersonaBandSection({
    required super.anchor,
    required this.heading,
    required this.body,
    required this.layout,
    required this.personas,
    required this.cta,
  });

  final String heading;
  final String? body;
  final PersonaBandLayout layout;
  final List<Persona> personas;
  final Cta? cta;

  @override
  List<Object?> get props => [anchor, heading, body, layout, personas, cta];
}

final class FaqItem extends Equatable {
  const FaqItem({required this.question, required this.answer});

  final String question;
  final RichTextDocument answer;

  @override
  List<Object?> get props => [question, answer];
}

final class FaqSection extends Section {
  const FaqSection({
    required super.anchor,
    required this.heading,
    required this.items,
  });

  final String heading;
  final List<FaqItem> items;

  @override
  List<Object?> get props => [anchor, heading, items];
}

final class LogoItem extends Equatable {
  const LogoItem({
    required this.name,
    required this.image,
    required this.imageDark,
  });

  final String name;
  final ImageRef image;
  final ImageRef? imageDark;

  @override
  List<Object?> get props => [name, image, imageDark];
}

final class LogoCloudSection extends Section {
  const LogoCloudSection({
    required super.anchor,
    required this.heading,
    required this.logos,
  });

  final String heading;
  final List<LogoItem> logos;

  @override
  List<Object?> get props => [anchor, heading, logos];
}

final class RichTextSection extends Section {
  const RichTextSection({required super.anchor, required this.content});

  final RichTextDocument content;

  @override
  List<Object?> get props => [anchor, content];
}

final class CallToActionSection extends Section {
  const CallToActionSection({
    required super.anchor,
    required this.heading,
    required this.body,
    required this.primary,
    required this.secondary,
  });

  final String heading;
  final String? body;
  final Cta? primary;
  final Cta? secondary;

  @override
  List<Object?> get props => [anchor, heading, body, primary, secondary];
}

final class CreatorNetworkSection extends Section {
  const CreatorNetworkSection({
    required super.anchor,
    required this.heading,
    required this.subheading,
    required this.creators,
    required this.cta,
  });

  final String heading;
  final String? subheading;
  final List<CreatorCard> creators;
  final Cta? cta;

  @override
  List<Object?> get props => [anchor, heading, subheading, creators, cta];
}

/// A section type added to v1 after this build; [type] is its wire name.
final class UnknownSection extends Section {
  const UnknownSection({required super.anchor, required this.type});

  final String type;

  @override
  List<Object?> get props => [anchor, type];
}

/// Decodes `sectionV1`. Throws [FormatException] on a missing or mistyped
/// field of a known type; an unknown type is not an error.
final class SectionModel {
  const SectionModel._(this._entity);

  factory SectionModel.fromJson(Json json) {
    final type = readString(json, 'type');
    // Read on first use, so an unknown type reads nothing it may have
    // reshaped.
    late final anchor = readNullableString(json, 'anchor');
    return SectionModel._(switch (type) {
      'howItWorks' => HowItWorksSection(
        anchor: anchor,
        heading: readString(json, 'heading'),
        subheading: readNullableString(json, 'subheading'),
        steps: _objects(
          json,
          'steps',
          (step) => HowItWorksStep(
            title: readString(step, 'title'),
            body: readNullableString(step, 'body'),
            visual: readEnum(
              step,
              'visual',
              StepVisual.values,
              StepVisual.unknown,
            ),
          ),
        ),
        cta: CtaModel.readNullable(json, 'cta'),
      ),
      'features' => FeaturesSection(
        anchor: anchor,
        heading: readString(json, 'heading'),
        subheading: readNullableString(json, 'subheading'),
        items: _objects(
          json,
          'items',
          (item) => FeatureItem(
            title: readString(item, 'title'),
            body: readNullableString(item, 'body'),
            glyph: readNullableString(item, 'glyph'),
            pointsAt: readEnum(
              item,
              'pointsAt',
              FeaturePointsAt.values,
              FeaturePointsAt.unknown,
            ),
          ),
        ),
      ),
      'categoriesGrid' => CategoriesGridSection(
        anchor: anchor,
        heading: readString(json, 'heading'),
        subheading: readNullableString(json, 'subheading'),
        tiles: _objects(json, 'tiles', (tile) {
          final counts = readObject(tile, 'counts');
          return CategoryTile(
            category: CategoryModel.fromJson(readObject(tile, 'category'))
                .toEntity(),
            samples: readInt(counts, 'samples'),
            professionals: readInt(counts, 'professionals'),
            hasPage: readBool(tile, 'hasPage'),
          );
        }),
        cta: CtaModel.readNullable(json, 'cta'),
      ),
      'personaBand' => PersonaBandSection(
        anchor: anchor,
        heading: readString(json, 'heading'),
        body: readNullableString(json, 'body'),
        layout: readEnum(
          json,
          'layout',
          PersonaBandLayout.values,
          PersonaBandLayout.unknown,
        ),
        personas: PersonaModel.readAll(json, 'personas'),
        cta: CtaModel.readNullable(json, 'cta'),
      ),
      'faq' => FaqSection(
        anchor: anchor,
        heading: readString(json, 'heading'),
        items: _objects(
          json,
          'items',
          (item) => FaqItem(
            question: readString(item, 'question'),
            answer: RichTextModel.read(item, 'answer'),
          ),
        ),
      ),
      'logoCloud' => LogoCloudSection(
        anchor: anchor,
        heading: readString(json, 'heading'),
        logos: _objects(
          json,
          'logos',
          (logo) => LogoItem(
            name: readString(logo, 'name'),
            image: ImageRefModel.read(logo, 'image'),
            imageDark: ImageRefModel.readNullable(logo, 'imageDark'),
          ),
        ),
      ),
      'richText' => RichTextSection(
        anchor: anchor,
        content: RichTextModel.read(json, 'content'),
      ),
      'callToAction' => CallToActionSection(
        anchor: anchor,
        heading: readString(json, 'heading'),
        body: readNullableString(json, 'body'),
        primary: CtaModel.readNullable(json, 'primary'),
        secondary: CtaModel.readNullable(json, 'secondary'),
      ),
      'creatorNetwork' => CreatorNetworkSection(
        anchor: anchor,
        heading: readString(json, 'heading'),
        subheading: readNullableString(json, 'subheading'),
        creators: _objects(
          json,
          'creators',
          (card) => CreatorCardModel.fromJson(card).toEntity(),
        ),
        cta: CtaModel.readNullable(json, 'cta'),
      ),
      _ => UnknownSection(
        anchor: switch (json['anchor']) {
          final String value => value,
          _ => null,
        },
        type: type,
      ),
    });
  }

  /// A list of `sectionV1` at [key].
  static List<Section> readAll(Json json, String key) {
    return _objects(
      json,
      key,
      (section) => SectionModel.fromJson(section).toEntity(),
    );
  }

  final Section _entity;

  Section toEntity() => _entity;
}

List<T> _objects<T>(Json json, String key, T Function(Json item) decode) {
  return List.unmodifiable(
    readList(json, key, (item) => decode(asObject(item))),
  );
}
