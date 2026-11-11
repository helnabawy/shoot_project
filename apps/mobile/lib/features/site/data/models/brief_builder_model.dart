import 'package:shoot_mobile/core/network/json_read.dart';
import 'package:shoot_mobile/features/site/domain/entities/brief_builder.dart';

/// Decodes `GET /api/mobile/v1/brief-builder` (`briefBuilderV1`). Throws
/// [FormatException] on a missing or mistyped field; an unknown slot kind
/// reads as [SlotKind.unknown].
final class BriefBuilderModel {
  const BriefBuilderModel._(this._entity);

  factory BriefBuilderModel.fromJson(Json json) {
    final builder = readNullableObject(json, 'builder');
    return BriefBuilderModel._(
      BriefBuilder(
        locale: readString(json, 'locale'),
        builder: builder == null ? null : _config(builder),
      ),
    );
  }

  final BriefBuilder _entity;

  BriefBuilder toEntity() => _entity;
}

BriefBuilderConfig _config(Json json) {
  return BriefBuilderConfig(
    sentence: readString(json, 'sentence'),
    slots: List.unmodifiable(
      readList(json, 'slots', (item) => _slot(asObject(item))),
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

BuilderSlot _slot(Json json) {
  return BuilderSlot(
    token: readString(json, 'token'),
    kind: readEnum(json, 'kind', SlotKind.values, SlotKind.unknown),
    groupLabel: readString(json, 'groupLabel'),
    placeholder: readString(json, 'placeholder'),
    defaultValue: readString(json, 'defaultValue'),
    required: readBool(json, 'required'),
    allowCustom: readBool(json, 'allowCustom'),
    multiple: readBool(json, 'multiple'),
    options: List.unmodifiable(
      readList(json, 'options', (item) {
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
}
