import 'package:equatable/equatable.dart';
import 'package:shoot_mobile/core/media/image_ref.dart';
import 'package:shoot_mobile/core/network/json_read.dart';

/// A creator as a card (`creatorCardV1`): the landing's network section now,
/// the directory in US3. Shared, so it lives in `core/`.
final class CreatorCard extends Equatable {
  const CreatorCard({
    required this.code,
    required this.displayCode,
    required this.name,
    required this.initials,
    required this.photo,
    required this.types,
    required this.places,
    required this.specialties,
    required this.languages,
    required this.yearsExperience,
    required this.sampleCount,
    required this.featured,
  });

  /// The stored code, opaque: what `creators/{code}` takes.
  final String code;

  /// With the brand prefix: "SH-0087".
  final String displayCode;
  final String name;
  final String initials;
  final ImageRef? photo;

  /// The creator's professional types in CMS words.
  final String types;
  final List<String> places;
  final List<String> specialties;

  /// Language names in the answer's language.
  final List<String> languages;
  final int? yearsExperience;
  final int sampleCount;
  final bool featured;

  @override
  List<Object?> get props => [
    code,
    displayCode,
    name,
    initials,
    photo,
    types,
    places,
    specialties,
    languages,
    yearsExperience,
    sampleCount,
    featured,
  ];
}

/// Decodes `creatorCardV1`. Throws [FormatException] on a missing or
/// mistyped field.
final class CreatorCardModel {
  const CreatorCardModel._(this._entity);

  factory CreatorCardModel.fromJson(Json json) {
    return CreatorCardModel._(
      CreatorCard(
        code: readString(json, 'code'),
        displayCode: readString(json, 'displayCode'),
        name: readString(json, 'name'),
        initials: readString(json, 'initials'),
        photo: ImageRefModel.readNullable(json, 'photo'),
        types: readString(json, 'types'),
        places: List.unmodifiable(readStringList(json, 'places')),
        specialties: List.unmodifiable(readStringList(json, 'specialties')),
        languages: List.unmodifiable(readStringList(json, 'languages')),
        yearsExperience: readNullableInt(json, 'yearsExperience'),
        sampleCount: readInt(json, 'sampleCount'),
        featured: readBool(json, 'featured'),
      ),
    );
  }

  final CreatorCard _entity;

  CreatorCard toEntity() => _entity;
}
