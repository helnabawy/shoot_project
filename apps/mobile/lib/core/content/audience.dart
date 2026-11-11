/// The audience as the CMS defines it: professional types (personas) and the
/// specialties (categories) they offer. Shared by the site feature and the
/// landing sections, so it lives in `core/`. Every label is CMS text; the app
/// never names a profession itself.
library;

import 'package:equatable/equatable.dart';
import 'package:shoot_mobile/core/media/image_ref.dart';
import 'package:shoot_mobile/core/network/json_read.dart';

/// One professional type (`personaV1`): "Photographer" / "Photographers".
final class Persona extends Equatable {
  const Persona({
    required this.id,
    required this.slug,
    required this.singular,
    required this.plural,
    required this.glyph,
    required this.description,
  });

  final String id;
  final String slug;
  final String singular;
  final String plural;

  /// A CMS icon choice; the app maps it to its icon set, with a default for
  /// a value it does not know.
  final String? glyph;
  final String? description;

  @override
  List<Object?> get props => [id, slug, singular, plural, glyph, description];
}

/// One specialty (`categoryV1`): "Weddings", with the personas offering it.
final class Category extends Equatable {
  const Category({
    required this.id,
    required this.slug,
    required this.name,
    required this.glyph,
    required this.description,
    required this.scene,
    required this.image,
    required this.personaIds,
  });

  final String id;
  final String slug;
  final String name;
  final String? glyph;
  final String? description;

  /// The drawing shown until the specialty has an image (a CMS choice).
  final String? scene;
  final ImageRef? image;
  final List<String> personaIds;

  @override
  List<Object?> get props => [
    id,
    slug,
    name,
    glyph,
    description,
    scene,
    image,
    personaIds,
  ];
}

/// Decodes `personaV1`. Throws [FormatException] on a missing or mistyped
/// field.
final class PersonaModel {
  const PersonaModel._(this._entity);

  factory PersonaModel.fromJson(Json json) {
    return PersonaModel._(
      Persona(
        id: readString(json, 'id'),
        slug: readString(json, 'slug'),
        singular: readString(json, 'singular'),
        plural: readString(json, 'plural'),
        glyph: readNullableString(json, 'glyph'),
        description: readNullableString(json, 'description'),
      ),
    );
  }

  /// A list of `personaV1` at [key].
  static List<Persona> readAll(Json json, String key) {
    return List.unmodifiable(
      readList(
        json,
        key,
        (item) => PersonaModel.fromJson(asObject(item)).toEntity(),
      ),
    );
  }

  final Persona _entity;

  Persona toEntity() => _entity;
}

/// Decodes `categoryV1`. Throws [FormatException] on a missing or mistyped
/// field.
final class CategoryModel {
  const CategoryModel._(this._entity);

  factory CategoryModel.fromJson(Json json) {
    return CategoryModel._(
      Category(
        id: readString(json, 'id'),
        slug: readString(json, 'slug'),
        name: readString(json, 'name'),
        glyph: readNullableString(json, 'glyph'),
        description: readNullableString(json, 'description'),
        scene: readNullableString(json, 'scene'),
        image: ImageRefModel.readNullable(json, 'image'),
        personaIds: List.unmodifiable(readStringList(json, 'personaIds')),
      ),
    );
  }

  /// A list of `categoryV1` at [key].
  static List<Category> readAll(Json json, String key) {
    return List.unmodifiable(
      readList(
        json,
        key,
        (item) => CategoryModel.fromJson(asObject(item)).toEntity(),
      ),
    );
  }

  final Category _entity;

  Category toEntity() => _entity;
}
