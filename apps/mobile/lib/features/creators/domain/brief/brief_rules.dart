import 'package:equatable/equatable.dart';
import 'package:shoot_mobile/features/creators/domain/entities/creators.dart';
import 'package:shoot_mobile/features/site/domain/entities/brief_builder.dart';

/// The separator of a multiple slot's values, as the website's `MULTI_SEPARATOR`.
const _multi = ',';

/// The longest typed value, as the website's `CUSTOM_TEXT_MAX`.
const customTextMax = 80;

/// The creator a brief is started for (screen 17): the brief's persona and place options are
/// limited to what they offer (MC FR-020).
final class BriefCreator extends Equatable {
  const BriefCreator({
    required this.code,
    required this.displayCode,
    required this.name,
    required this.types,
    required this.personaSlugs,
    required this.places,
  });

  factory BriefCreator.fromProfile(CreatorProfile profile) => BriefCreator(
    code: profile.code,
    displayCode: profile.displayCode,
    name: profile.name,
    types: profile.types,
    personaSlugs: profile.personaSlugs,
    places: profile.places,
  );

  final String code;
  final String displayCode;
  final String name;
  final String types;

  /// The creator's types the site offers.
  final List<String> personaSlugs;

  /// Emirate names in the answer's language.
  final List<String> places;

  /// "Omar" from "Omar K.".
  String get firstName {
    final parts = name.trim().split(RegExp(r'\s+'));
    return parts.first;
  }

  @override
  List<Object?> get props => [
    code,
    displayCode,
    name,
    types,
    personaSlugs,
    places,
  ];
}

/// A piece of the brief sentence: plain [SentenceText] or the [SentenceToken] of a slot.
sealed class SentencePart extends Equatable {
  const SentencePart();
}

final class SentenceText extends SentencePart {
  const SentenceText(this.text);

  final String text;

  @override
  List<Object?> get props => [text];
}

final class SentenceToken extends SentencePart {
  const SentenceToken({
    required this.slot,
    required this.label,
    required this.isSet,
  });

  final BuilderSlot slot;

  /// The chosen words, or the slot's placeholder when nothing is chosen.
  final String label;
  final bool isSet;

  @override
  List<Object?> get props => [slot, label, isSet];
}

/// The brief's rules, pure Dart and the same as the website's `domain/brief` (options per
/// persona, validation, the sentence and the WhatsApp message). [values] map a slot token to its
/// value: an option value, several joined by `,`, a typed text, an ISO date or a number.
final class BriefRules {
  const BriefRules(this.config, {this.creator});

  final BriefBuilderConfig config;
  final BriefCreator? creator;

  static final _token = RegExp(r'\{([a-zA-Z][a-zA-Z0-9]*)\}');

  BuilderSlot? get personaSlot {
    for (final slot in config.slots) {
      if (slot.kind == SlotKind.persona) return slot;
    }
    return null;
  }

  static List<String> split(String value) => [
    for (final v in value.split(_multi))
      if (v.trim().isNotEmpty) v.trim(),
  ];

  List<String> _chosenPersonas(Map<String, String> values) {
    final slot = personaSlot;
    return slot == null ? const [] : split(values[slot.token] ?? '');
  }

  /// The options [slot] offers now: those that apply to the chosen types, and with a creator,
  /// only what the creator offers (their types; the emirates they work in).
  List<BuilderOption> options(BuilderSlot slot, Map<String, String> values) {
    if (slot.kind != SlotKind.persona && slot.kind != SlotKind.options) {
      return const [];
    }
    final chosen = _chosenPersonas(values);
    var options = [
      for (final o in slot.options)
        if (slot.kind == SlotKind.persona ||
            o.personaSlugs.isEmpty ||
            o.personaSlugs.any(chosen.contains))
          o,
    ];
    final c = creator;
    if (c == null) return options;
    if (slot.kind == SlotKind.persona) {
      return [
        for (final o in options)
          if (c.personaSlugs.contains(o.value)) o,
      ];
    }
    if (isPlaceSlot(slot)) {
      final names = {for (final p in c.places) p.trim().toLowerCase()};
      options = [
        for (final o in options)
          if (names.contains(o.label.trim().toLowerCase())) o,
      ];
    }
    return options;
  }

  /// The place slot is the options slot whose options include one of the creator's emirates.
  bool isPlaceSlot(BuilderSlot slot) {
    final c = creator;
    if (c == null || slot.kind != SlotKind.options) return false;
    final names = {for (final p in c.places) p.trim().toLowerCase()};
    return slot.options.any(
      (o) => names.contains(o.label.trim().toLowerCase()),
    );
  }

  /// With a creator, a required slot left with exactly one option is that option.
  Map<String, String> withFixed(Map<String, String> values) {
    if (creator == null) return values;
    final next = Map<String, String>.of(values);
    for (final slot in config.slots) {
      if (slot.multiple) continue;
      final offered = options(slot, next);
      final restricted = slot.kind == SlotKind.persona || isPlaceSlot(slot);
      if (restricted && slot.required && offered.length == 1) {
        next[slot.token] = offered.single.value;
      }
    }
    return next;
  }

  /// Keeps the answers that are still valid choices and drops the rest, in slot order, so a
  /// word that is not an option any more is left open (MC FR-051, FR-022).
  Map<String, String> keepValid(Map<String, String> answers) {
    final next = <String, String>{};
    for (final slot in config.slots) {
      final value = answers[slot.token];
      if (value == null || value.isEmpty) continue;
      if (_valueError(slot, value, next, today: null) == null) {
        next[slot.token] = value;
      }
    }
    return next;
  }

  /// The first required slot with no valid answer, or `null` when the brief is complete.
  BuilderSlot? nextOpen(Map<String, String> values, {String? today}) {
    for (final slot in config.slots) {
      final value = values[slot.token] ?? '';
      if (value.isEmpty) {
        if (slot.required && slot.kind != SlotKind.date) return slot;
        continue;
      }
      if (_valueError(slot, value, values, today: today) != null) return slot;
    }
    return null;
  }

  /// How many required slots still need an answer.
  int openCount(Map<String, String> values, {String? today}) {
    var n = 0;
    for (final slot in config.slots) {
      final value = values[slot.token] ?? '';
      if (value.isEmpty
          ? slot.required && slot.kind != SlotKind.date
          : _valueError(slot, value, values, today: today) != null) {
        n++;
      }
    }
    return n;
  }

  bool isComplete(Map<String, String> values, {String? today}) =>
      openCount(values, today: today) == 0 && _canOffer(values);

  /// With a creator, a required choice slot with no option left cannot be answered (spec edge
  /// case: the brief cannot complete and WhatsApp is offered).
  bool _canOffer(Map<String, String> values) {
    if (creator == null) return true;
    for (final slot in config.slots) {
      if (!slot.required) continue;
      if ((slot.kind == SlotKind.persona || slot.kind == SlotKind.options) &&
          !slot.allowCustom &&
          options(slot, values).isEmpty) {
        return false;
      }
    }
    return true;
  }

  /// Whether the brief can be answered at all with this creator.
  bool canComplete(Map<String, String> values) => _canOffer(values);

  String? _valueError(
    BuilderSlot slot,
    String value,
    Map<String, String> values, {
    required String? today,
  }) {
    switch (slot.kind) {
      case SlotKind.date:
        final ok =
            RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(value) &&
            DateTime.tryParse(value) != null;
        if (!ok) return 'dateInvalid';
        if (today != null && value.compareTo(today) < 0) return 'datePast';
        return null;
      case SlotKind.number:
        final n = int.tryParse(value);
        return n != null && n >= 1 && n <= 999 ? null : 'numberInvalid';
      case SlotKind.persona || SlotKind.options:
        final parts = slot.multiple ? split(value) : [value];
        if (parts.isEmpty) return 'required';
        final allowed = {for (final o in options(slot, values)) o.value};
        for (final part in parts) {
          if (part.length > customTextMax) return 'tooLong';
          // A known option that does not apply any more is refused even where typing is allowed.
          final known = slot.options.any((o) => o.value == part);
          if (!allowed.contains(part) && (known || !slot.allowCustom)) {
            return 'notAnOption';
          }
        }
        return null;
      case SlotKind.unknown:
        return null;
    }
  }

  /// The sentence in order: text and one token per slot with its words or its placeholder.
  List<SentencePart> sentence(
    Map<String, String> values, {
    String Function(String iso)? formatDate,
  }) {
    final parts = <SentencePart>[];
    var last = 0;
    final template = config.sentence;
    for (final m in _token.allMatches(template)) {
      if (m.start > last)
        parts.add(SentenceText(template.substring(last, m.start)));
      final slot = _slot(m.group(1)!);
      if (slot == null) {
        parts.add(SentenceText(m.group(0)!));
      } else {
        final label = labelFor(slot, values, formatDate: formatDate);
        parts.add(
          SentenceToken(
            slot: slot,
            label: label ?? slot.placeholder,
            isSet: label != null,
          ),
        );
      }
      last = m.end;
    }
    if (last < template.length)
      parts.add(SentenceText(template.substring(last)));
    return parts;
  }

  BuilderSlot? _slot(String token) {
    for (final slot in config.slots) {
      if (slot.token == token) return slot;
    }
    return null;
  }

  /// The words for a slot's value in the sentence, or `null` when unset.
  String? labelFor(
    BuilderSlot slot,
    Map<String, String> values, {
    String Function(String iso)? formatDate,
  }) {
    final value = values[slot.token] ?? '';
    if (value.isEmpty) return null;
    switch (slot.kind) {
      case SlotKind.date:
        return formatDate == null ? value : formatDate(value);
      case SlotKind.number || SlotKind.unknown:
        return value;
      case SlotKind.persona || SlotKind.options:
        final labels = <String>[];
        for (final part in slot.multiple ? split(value) : [value]) {
          final match = slot.options.where((o) => o.value == part);
          labels.add(match.isEmpty ? part : match.first.sentenceLabel);
        }
        return labels.join(', ');
    }
  }

  /// The WhatsApp message, as the website's `composeMessage`: the CMS template with each slot's
  /// words, optional parts nobody set left out with their joining words, and the creator on a
  /// line of their own when the template has no `{creator}` (CP-US2-S2).
  String message(
    Map<String, String> values, {
    String Function(String iso)? formatDate,
    String? creatorText,
    String? creatorLine,
  }) {
    final template = _joinParts(
      _omit(_parse(config.whatsappTemplate), (name) {
        final slot = _slot(name);
        return slot != null && !slot.required && (values[name] ?? '').isEmpty;
      }),
    );
    final lines = [template];
    if (creatorLine != null && !template.contains('{creator}')) {
      lines.add(creatorLine);
    }
    final labels = <String, String>{
      for (final slot in config.slots)
        slot.token:
            labelFor(slot, values, formatDate: formatDate) ?? slot.placeholder,
      'creator': ?creatorText,
    };
    return lines
        .join('\n')
        .replaceAllMapped(_token, (m) => labels[m.group(1)!] ?? '')
        .replaceAll(RegExp(r'[ \t]{2,}'), ' ')
        .replaceAllMapped(RegExp(r' ([,.،])'), (m) => m.group(1)!)
        .trim();
  }

  static List<_Part> _parse(String template) {
    final parts = <_Part>[];
    var last = 0;
    for (final m in _token.allMatches(template)) {
      if (m.start > last)
        parts.add(_Part.text(template.substring(last, m.start)));
      parts.add(_Part.token(m.group(1)!));
      last = m.end;
    }
    if (last < template.length) parts.add(_Part.text(template.substring(last)));
    return parts;
  }

  static List<_Part> _omit(List<_Part> parts, bool Function(String) omit) {
    final out = <_Part>[];
    for (final part in parts) {
      if (part.token != null && omit(part.token!)) {
        if (out.isNotEmpty && out.last.token == null) {
          final punctuation =
              RegExp(r'^\s*([,.،؛;:])').firstMatch(out.last.text!)?.group(1) ??
              '';
          out[out.length - 1] = _Part.text('$punctuation ');
        }
        continue;
      }
      if (part.token == null && out.isNotEmpty && out.last.token == null) {
        out[out.length - 1] = _Part.text(
          (out.last.text! + part.text!)
              .replaceAll(RegExp(r'\s{2,}'), ' ')
              .replaceAllMapped(
                RegExp(r'[,،؛;:]\s*([.,،؛;:])'),
                (m) => m.group(1)!,
              ),
        );
      } else {
        out.add(part);
      }
    }
    return out;
  }

  static String _joinParts(List<_Part> parts) =>
      parts.map((p) => p.token == null ? p.text! : '{${p.token}}').join();
}

final class _Part {
  const _Part.text(String this.text) : token = null;
  const _Part.token(String this.token) : text = null;

  final String? text;
  final String? token;
}
