import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/brief/domain/brief_draft.dart';
import 'package:shoot_mobile/features/brief/domain/brief_receipt.dart';
import 'package:shoot_mobile/features/site/domain/entities/brief_builder.dart';

BuilderOption fxOption(String v, {List<String> personas = const []}) =>
    BuilderOption(
      value: v,
      label: v[0].toUpperCase() + v.substring(1),
      sentenceLabel: v,
      glyph: null,
      personaSlugs: personas,
    );

BuilderSlot fxSlot(
  String token,
  SlotKind kind, {
  bool required = true,
  bool multiple = false,
  String def = '',
  List<BuilderOption> options = const [],
}) => BuilderSlot(
  token: token,
  kind: kind,
  groupLabel: token,
  placeholder: 'which $token',
  defaultValue: def,
  required: required,
  allowCustom: false,
  multiple: multiple,
  options: options,
);

/// A builder in the shape of the shared example: persona, occasion, location, optional date.
BriefBuilderConfig fxConfig() => BriefBuilderConfig(
  sentence: 'I need {persona} for {occasion} in {location} on {date}.',
  slots: [
    fxSlot(
      'persona',
      SlotKind.persona,
      multiple: true,
      options: [fxOption('photographer'), fxOption('videographer')],
    ),
    fxSlot(
      'occasion',
      SlotKind.options,
      options: [
        fxOption('wedding'),
        fxOption('event'),
        fxOption('reel', personas: ['videographer']),
      ],
    ),
    fxSlot(
      'location',
      SlotKind.options,
      options: [fxOption('dubai'), fxOption('abudhabi')],
    ),
    fxSlot('date', SlotKind.date, required: false),
  ],
  submitLabel: "See price and who's free",
  helperText: 'No account needed. Price shown next.',
  whatsappTemplate: 'Hi!',
  successMessage: 'Done',
  steps: const [],
);

const fxReceipt = BriefReceipt(
  reference: 'B-1',
  sentence: 'I need a photographer.',
  whatsappUrl: 'https://wa.me/971501234567?text=Hi',
  matchPath: null,
);

/// A repository that returns [result] and remembers what it was asked to record.
final class FakeBriefRepository implements BriefRepository {
  FakeBriefRepository([this.result = const Ok(fxReceipt)]);

  Result<BriefReceipt> result;
  final List<BriefDraft> recorded = [];

  @override
  Future<Result<BriefReceipt>> record(
    BriefBuilderConfig config,
    BriefDraft draft,
  ) async {
    recorded.add(draft);
    return result;
  }
}
