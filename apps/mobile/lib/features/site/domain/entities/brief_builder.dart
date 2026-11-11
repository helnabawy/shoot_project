import 'package:equatable/equatable.dart';

/// What a slot of the brief sentence asks for. A value this build does not
/// know reads as [unknown].
enum SlotKind { persona, options, date, number, unknown }

/// One option of a slot: its stored [value] and its words in the list and in
/// the sentence.
final class BuilderOption extends Equatable {
  const BuilderOption({
    required this.value,
    required this.label,
    required this.sentenceLabel,
    required this.glyph,
    required this.personaSlugs,
  });

  final String value;
  final String label;
  final String sentenceLabel;
  final String? glyph;

  /// Persona slugs the option applies to; empty means every persona.
  final List<String> personaSlugs;

  @override
  List<Object?> get props => [value, label, sentenceLabel, glyph, personaSlugs];
}

/// One `{token}` of the brief sentence.
final class BuilderSlot extends Equatable {
  const BuilderSlot({
    required this.token,
    required this.kind,
    required this.groupLabel,
    required this.placeholder,
    required this.defaultValue,
    required this.required,
    required this.allowCustom,
    required this.multiple,
    required this.options,
  });

  final String token;
  final SlotKind kind;
  final String groupLabel;
  final String placeholder;
  final String defaultValue;
  final bool required;
  final bool allowCustom;
  final bool multiple;
  final List<BuilderOption> options;

  @override
  List<Object?> get props => [
    token,
    kind,
    groupLabel,
    placeholder,
    defaultValue,
    required,
    allowCustom,
    multiple,
    options,
  ];
}

/// One "how it works" step shown under the builder.
final class BuilderStep extends Equatable {
  const BuilderStep({required this.title, required this.description});

  final String title;
  final String description;

  @override
  List<Object?> get props => [title, description];
}

/// The brief builder's sentence, slots and words (all CMS data).
final class BriefBuilderConfig extends Equatable {
  const BriefBuilderConfig({
    required this.sentence,
    required this.slots,
    required this.submitLabel,
    required this.helperText,
    required this.whatsappTemplate,
    required this.successMessage,
    required this.steps,
  });

  /// The sentence with `{token}` placeholders, one per slot.
  final String sentence;
  final List<BuilderSlot> slots;
  final String submitLabel;
  final String helperText;
  final String whatsappTemplate;
  final String successMessage;
  final List<BuilderStep> steps;

  @override
  List<Object?> get props => [
    sentence,
    slots,
    submitLabel,
    helperText,
    whatsappTemplate,
    successMessage,
    steps,
  ];
}

/// The brief builder (`briefBuilderV1`) in [locale]; [builder] is `null` when
/// it is switched off.
final class BriefBuilder extends Equatable {
  const BriefBuilder({required this.locale, required this.builder});

  final String locale;
  final BriefBuilderConfig? builder;

  bool get enabled => builder != null;

  @override
  List<Object?> get props => [locale, builder];
}
