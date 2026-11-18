import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/features/brief/domain/brief_draft.dart';
import 'package:shoot_mobile/features/site/domain/entities/brief_builder.dart';

BuilderOption opt(String v, {List<String> personas = const []}) =>
    BuilderOption(
      value: v,
      label: v.toUpperCase(),
      sentenceLabel: v,
      glyph: null,
      personaSlugs: personas,
    );

BuilderSlot slot(
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
  placeholder: token,
  defaultValue: def,
  required: required,
  allowCustom: false,
  multiple: multiple,
  options: options,
);

BriefBuilderConfig testConfig() => BriefBuilderConfig(
  sentence: 'I need {persona} for {occasion} in {location} on {date}.',
  slots: [
    slot(
      'persona',
      SlotKind.persona,
      multiple: true,
      options: [opt('photo'), opt('video')],
    ),
    slot(
      'occasion',
      SlotKind.options,
      def: 'wedding',
      options: [
        opt('event'),
        opt('wedding'),
        opt('reel', personas: ['video']),
      ],
    ),
    slot(
      'location',
      SlotKind.options,
      options: [opt('dubai'), opt('abudhabi')],
    ),
    slot('date', SlotKind.date, required: false),
  ],
  submitLabel: 'go',
  helperText: '',
  whatsappTemplate: '',
  successMessage: '',
  steps: const [],
);

void main() {
  timeGroup();
  final engine = BriefEngine(testConfig());
  const empty = BriefDraft();

  test('ML-US1-S3 a choice moves to the next unanswered step', () {
    expect(engine.nextStep(empty)!.token, 'persona');
    final d = engine.choose(empty, 'persona', 'photo').draft;
    expect(engine.nextStep(d)!.token, 'occasion');
  });

  test('ML-US1-S3 a multiple slot toggles values and keeps pick order', () {
    var d = engine.choose(empty, 'persona', 'video').draft;
    d = engine.choose(d, 'persona', 'photo').draft;
    expect(d.valuesOf('persona'), ['video', 'photo']);
    d = engine.choose(d, 'persona', 'video').draft;
    expect(d.valuesOf('persona'), ['photo']);
  });

  test('ML-US1-S3 the default is listed first and never pre-filled', () {
    final s = engine.slot('occasion')!;
    expect(engine.visibleOptions(s, empty).first.value, 'wedding');
    expect(empty.valuesOf('occasion'), isEmpty);
  });

  test('ML-US1-S4 options are filtered to the chosen types', () {
    final s = engine.slot('occasion')!;
    final photo = engine.choose(empty, 'persona', 'photo').draft;
    expect(
      engine.visibleOptions(s, photo).map((o) => o.value),
      isNot(contains('reel')),
    );
    final video = engine.choose(empty, 'persona', 'video').draft;
    expect(
      engine.visibleOptions(s, video).map((o) => o.value),
      contains('reel'),
    );
  });

  test('ML-US1-S4 changing the type clears answers no longer offered', () {
    var d = engine.choose(empty, 'persona', 'video').draft;
    d = engine.choose(d, 'occasion', 'reel').draft;
    // photo is added next to video: reel then needs both types, so it is cleared.
    final change = engine.choose(d, 'persona', 'photo');
    expect(change.cleared, ['occasion']);
    expect(change.draft.valuesOf('occasion'), isEmpty);
    expect(engine.nextStep(change.draft)!.token, 'occasion');
  });

  test('ML-US1-S5 first missing step and completeness', () {
    var d = engine.choose(empty, 'persona', 'photo').draft;
    expect(engine.isComplete(d), isFalse);
    expect(engine.firstMissing(d)!.token, 'occasion');
    d = engine.choose(d, 'occasion', 'event').draft;
    d = engine.choose(d, 'location', 'dubai').draft;
    expect(engine.isComplete(d), isTrue); // the date is optional
  });

  test('ML-US1-S3 an optional step is skipped, not required', () {
    var d = engine.choose(empty, 'persona', 'photo').draft;
    d = engine.choose(d, 'occasion', 'event').draft;
    d = engine.choose(d, 'location', 'dubai').draft;
    expect(engine.nextStep(d)!.token, 'date');
    d = engine.skip(d, 'date');
    expect(engine.nextStep(d), isNull);
  });

  test('ML-US1-S7 a past date in the business zone is refused', () {
    // 2026-12-05 21:00 UTC is 2026-12-06 01:00 in the UAE.
    final now = DateTime.utc(2026, 12, 5, 21);
    expect(businessToday(now), '2026-12-06');
    final refused = engine.setDate(empty, '2026-12-05', now);
    expect(refused.dateRefused, isTrue);
    expect(refused.draft.date, isNull);
    final ok = engine.setDate(empty, '2026-12-06', now);
    expect(ok.dateRefused, isFalse);
    expect(ok.draft.date, '2026-12-06');
  });

  test('ML-US1-S3 typing searches every step at once', () {
    final hits = engine.search(empty, 'dub');
    expect(hits.single.slot.token, 'location');
    expect(engine.search(empty, ' '), isEmpty);
  });

  test('ML-US1-S3 take back removes the last answer; reopen clears one', () {
    var d = engine.choose(empty, 'persona', 'photo').draft;
    d = engine.choose(d, 'occasion', 'event').draft;
    expect(engine.takeBack(d).valuesOf('occasion'), isEmpty);
    expect(engine.takeBack(d).valuesOf('persona'), ['photo']);
    expect(engine.reopen(d, 'persona').valuesOf('persona'), isEmpty);
  });
}

/// 026: the server adds a start time step right after the date.
BriefBuilderConfig timedConfig({bool timeRequired = false}) =>
    BriefBuilderConfig(
      sentence: 'I need {persona} on {date} at {time} in {location}.',
      slots: [
        slot('persona', SlotKind.persona, options: [opt('photo')]),
        slot('date', SlotKind.date, required: false),
        slot(
          'time',
          SlotKind.time,
          required: timeRequired,
          options: [opt('09-00'), opt('16-00')],
        ),
        slot('location', SlotKind.options, options: [opt('dubai')]),
      ],
      submitLabel: 'go',
      helperText: '',
      whatsappTemplate: '',
      successMessage: '',
      steps: const [],
    );

void timeGroup() {
  final now = DateTime.utc(2026, 11, 18, 8);
  final e = BriefEngine(timedConfig(timeRequired: true));
  BriefDraft dated() => e
      .setDate(
        e.choose(const BriefDraft(), 'persona', 'photo').draft,
        '2026-11-19',
        now,
      )
      .draft;

  group('026 the start time step', () {
    test('BT-US1-S5 after the date the next step is the time, counted', () {
      expect(e.nextStep(dated())?.token, 'time');
      expect(e.askedSlots(dated()).map((s) => s.token), [
        'persona',
        'date',
        'time',
        'location',
      ]);
      expect(e.firstMissing(dated())?.token, 'time');
    });

    test('BT-US1-S4 any date waives the time: not asked, not counted, '
        'not missing, a picked time dropped', () {
      final timed = e.choose(dated(), 'time', '16-00').draft;
      final reopened = e.reopen(timed, 'date');
      final anyDate = e.skip(e.setDate(reopened, null, now).draft, 'date');
      expect(anyDate.valuesOf('time'), isEmpty);
      expect(e.timeWaived(anyDate), isTrue);
      expect(e.nextStep(anyDate)?.token, 'location');
      expect(e.firstMissing(anyDate)?.token, 'location');
      expect(e.askedSlots(anyDate).map((s) => s.token), [
        'persona',
        'date',
        'location',
      ]);
      expect(e.search(anyDate, '09'), isEmpty);
      expect(e.search(dated(), '09').single.slot.token, 'time');
    });

    test('BT-US1-S3 an optional time is skipped with "any time"', () {
      final optional = BriefEngine(timedConfig());
      final skipped = optional.skip(dated(), 'time');
      expect(optional.nextStep(skipped)?.token, 'location');
      expect(optional.isAnswered(optional.slot('time')!, skipped), isFalse);
    });
  });
}
