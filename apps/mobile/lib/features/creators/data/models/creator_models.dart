import 'package:shoot_mobile/core/content/creator_card.dart';
import 'package:shoot_mobile/core/content/links.dart';
import 'package:shoot_mobile/core/content/pagination.dart';
import 'package:shoot_mobile/core/content/rich_text.dart';
import 'package:shoot_mobile/core/content/sections.dart';
import 'package:shoot_mobile/core/media/image_ref.dart';
import 'package:shoot_mobile/core/network/json_read.dart';
import 'package:shoot_mobile/features/creators/domain/entities/creators.dart';
import 'package:shoot_mobile/features/site/domain/entities/brief_builder.dart';

/// The models of the creators feature. Each `fromJson` throws
/// [FormatException] on a missing or mistyped field; unknown enum values read
/// as `unknown`; unknown keys are ignored.

List<CreatorCard> _cards(Json json, String key) => List.unmodifiable(
  readList(
    json,
    key,
    (item) => CreatorCardModel.fromJson(asObject(item)).toEntity(),
  ),
);

/// Decodes `GET /api/mobile/v1/creators` (`creatorListV1`).
final class CreatorListModel {
  const CreatorListModel._(this._entity);

  factory CreatorListModel.fromJson(Json json) {
    return CreatorListModel._(
      CreatorList(
        locale: readString(json, 'locale'),
        items: _cards(json, 'items'),
        filters: List.unmodifiable(
          readList(json, 'filters', (item) {
            final filter = asObject(item);
            return DirectoryFilter(
              key: readEnum(filter, 'key', FilterKey.values, FilterKey.unknown),
              label: readString(filter, 'label'),
              options: List.unmodifiable(
                readList(filter, 'options', (item) {
                  final option = asObject(item);
                  return FilterOption(
                    slug: readString(option, 'slug'),
                    name: readString(option, 'name'),
                    count: readInt(option, 'count'),
                    selected: readBool(option, 'selected'),
                  );
                }),
              ),
            );
          }),
        ),
        pagination: PaginationModel.read(json, 'pagination'),
      ),
    );
  }

  final CreatorList _entity;

  CreatorList toEntity() => _entity;
}

/// Decodes `GET /api/mobile/v1/creators/{code}` (`creatorProfileV1`).
final class CreatorProfileModel {
  const CreatorProfileModel._(this._entity);

  factory CreatorProfileModel.fromJson(Json json) {
    return CreatorProfileModel._(
      CreatorProfile(
        locale: readString(json, 'locale'),
        code: readString(json, 'code'),
        displayCode: readString(json, 'displayCode'),
        name: readString(json, 'name'),
        initials: readString(json, 'initials'),
        bio: readString(json, 'bio'),
        photo: ImageRefModel.readNullable(json, 'photo'),
        types: readString(json, 'types'),
        places: List.unmodifiable(readStringList(json, 'places')),
        specialties: List.unmodifiable(readStringList(json, 'specialties')),
        languages: List.unmodifiable(readStringList(json, 'languages')),
        nationality: readNullableString(json, 'nationality'),
        yearsExperience: readNullableInt(json, 'yearsExperience'),
        samples: List.unmodifiable(
          readList(json, 'samples', (item) {
            final sample = asObject(item);
            return Sample(
              id: readString(sample, 'id'),
              kind: readEnum(
                sample,
                'kind',
                SampleKind.values,
                SampleKind.unknown,
              ),
              thumb: ImageRefModel.read(sample, 'thumb'),
              large: ImageRefModel.read(sample, 'large'),
              alt: readString(sample, 'alt'),
              caption: readString(sample, 'caption'),
              specialty: readString(sample, 'specialty'),
              videoUrl: readNullableString(sample, 'videoUrl'),
              provider: readNullableString(sample, 'provider'),
            );
          }),
        ),
        social: ExternalLinkModel.readAll(json, 'social'),
        canBook: readBool(json, 'canBook'),
        personaSlugs: List.unmodifiable(readStringList(json, 'personaSlugs')),
      ),
    );
  }

  final CreatorProfile _entity;

  CreatorProfile toEntity() => _entity;
}

/// Decodes `GET /api/mobile/v1/work/{specialty}` (`specialtyPageV1`).
final class SpecialtyPageModel {
  const SpecialtyPageModel._(this._entity);

  factory SpecialtyPageModel.fromJson(Json json) {
    final category = readObject(json, 'category');
    final counts = readObject(json, 'counts');
    return SpecialtyPageModel._(
      SpecialtyPage(
        locale: readString(json, 'locale'),
        categoryId: readString(category, 'id'),
        slug: readString(category, 'slug'),
        name: readString(category, 'name'),
        title: readString(json, 'title'),
        description: readString(json, 'description'),
        intro: readString(json, 'intro'),
        sampleCount: readInt(counts, 'samples'),
        professionalCount: readInt(counts, 'professionals'),
        creators: _cards(json, 'creators'),
        samples: List.unmodifiable(
          readList(json, 'samples', (item) {
            final sample = asObject(item);
            return SpecialtySample(
              id: readString(sample, 'id'),
              creatorCode: readString(sample, 'creatorCode'),
              creatorName: readString(sample, 'creatorName'),
              thumb: ImageRefModel.read(sample, 'thumb'),
              alt: readString(sample, 'alt'),
              caption: readString(sample, 'caption'),
              kind: readEnum(
                sample,
                'kind',
                SampleKind.values,
                SampleKind.unknown,
              ),
            );
          }),
        ),
      ),
    );
  }

  final SpecialtyPage _entity;

  SpecialtyPage toEntity() => _entity;
}

/// Decodes `GET /api/mobile/v1/hire/{slug}` (`hirePageV1`).
final class HirePageModel {
  const HirePageModel._(this._entity);

  factory HirePageModel.fromJson(Json json) {
    final builder = readNullableObject(json, 'builder');
    final preset = readObject(json, 'preset');
    return HirePageModel._(
      HirePage(
        locale: readString(json, 'locale'),
        path: readString(json, 'path'),
        title: readString(json, 'title'),
        intro: readNullableString(json, 'intro'),
        sections: SectionModel.readAll(json, 'sections'),
        builder: builder == null ? null : _builderConfig(builder),
        // Token to option value; an entry that is not a string is a later
        // addition this build does not read.
        preset: Map.unmodifiable({
          for (final MapEntry(:key, :value) in preset.entries)
            if (value is String) key: value,
        }),
        creators: _cards(json, 'creators'),
        creatorTotal: readInt(json, 'creatorTotal'),
        faq: List.unmodifiable(
          readList(json, 'faq', (item) {
            final faq = asObject(item);
            return FaqItem(
              question: readString(faq, 'question'),
              answer: RichTextModel.read(faq, 'answer'),
            );
          }),
        ),
      ),
    );
  }

  final HirePage _entity;

  HirePage toEntity() => _entity;
}

// `briefBuilderConfigV1`. The site feature decodes the same shape inside
// `BriefBuilderModel`, but a feature never imports another feature's `data/`;
// this moves to `core/` when feature 011 builds the hire screen (008 T062 note).
BriefBuilderConfig _builderConfig(Json json) {
  return BriefBuilderConfig(
    sentence: readString(json, 'sentence'),
    slots: List.unmodifiable(
      readList(json, 'slots', (item) {
        final slot = asObject(item);
        return BuilderSlot(
          token: readString(slot, 'token'),
          kind: readEnum(slot, 'kind', SlotKind.values, SlotKind.unknown),
          groupLabel: readString(slot, 'groupLabel'),
          placeholder: readString(slot, 'placeholder'),
          defaultValue: readString(slot, 'defaultValue'),
          required: readBool(slot, 'required'),
          allowCustom: readBool(slot, 'allowCustom'),
          multiple: readBool(slot, 'multiple'),
          options: List.unmodifiable(
            readList(slot, 'options', (item) {
              final option = asObject(item);
              return BuilderOption(
                value: readString(option, 'value'),
                label: readString(option, 'label'),
                sentenceLabel: readString(option, 'sentenceLabel'),
                glyph: readNullableString(option, 'glyph'),
                personaSlugs: List.unmodifiable(
                  readStringList(option, 'personaSlugs'),
                ),
              );
            }),
          ),
        );
      }),
    ),
    submitLabel: readString(json, 'submitLabel'),
    helperText: readString(json, 'helperText'),
    whatsappTemplate: readString(json, 'whatsappTemplate'),
    successMessage: readString(json, 'successMessage'),
    steps: List.unmodifiable(
      readList(json, 'steps', (item) {
        final step = asObject(item);
        return BuilderStep(
          title: readString(step, 'title'),
          description: readString(step, 'description'),
        );
      }),
    ),
  );
}
