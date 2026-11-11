import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/content/cta.dart';
import 'package:shoot_mobile/core/content/rich_text.dart';
import 'package:shoot_mobile/core/content/sections.dart';
import 'package:shoot_mobile/features/landing/data/models/landing_model.dart';
import 'package:shoot_mobile/features/landing/domain/entities/landing.dart';
import 'package:shoot_mobile/features/site/data/models/brief_builder_model.dart';
import 'package:shoot_mobile/features/site/domain/entities/brief_builder.dart';

import '../../helpers/api_decoders.dart';
import '../../helpers/api_examples.dart';

/// Every response enum key in v1 (008): CTA and slot `kind`, hero and
/// persona-band `layout`, step `visual`, feature `pointsAt`.
const _enumKeys = {'kind', 'layout', 'visual', 'pointsAt'};

const _future = 'fromTheFuture';

/// A copy of [value] with an extra field in every object and, when
/// [enums] is set, an unknown value at every enum key.
Object? _evolve(Object? value, {bool enums = false}) {
  return switch (value) {
    Map() => {
      for (final MapEntry(:key, value: v) in value.entries)
        key as String: enums && _enumKeys.contains(key) && v is String
            ? _future
            : _evolve(v, enums: enums),
      'addedInV1Point9': {
        'nested': [1, 'two', null],
      },
    },
    List() => [for (final item in value) _evolve(item, enums: enums)],
    _ => value,
  };
}

/// A copy of [value] where every object whose `type` is in [types] gets an
/// unknown `type`.
Object? _retype(Object? value, Set<String> types) {
  return switch (value) {
    Map() => {
      for (final MapEntry(:key, value: v) in value.entries)
        key as String: key == 'type' && types.contains(v)
            ? _future
            : _retype(v, types),
    },
    List() => [for (final item in value) _retype(item, types)],
    _ => value,
  };
}

Map<String, Object?> _object(Object? value) => value! as Map<String, Object?>;

void main() {
  group('MR-US2-S5 forward compatibility', () {
    final names = [
      for (final name in exampleNames())
        if (apiDecoders.containsKey(exampleBaseName(name))) name,
    ];

    for (final name in names) {
      final decode = apiDecoders[exampleBaseName(name)]!;

      test('$name with an extra field everywhere still decodes '
          'to the same entity', () {
        final example = loadExample(name);
        expect(decode(_object(_evolve(example))), decode(example));
      });

      test('$name with an unknown value in every enum still decodes', () {
        expect(
          decode(_object(_evolve(loadExample(name), enums: true))),
          isNotNull,
        );
      });
    }

    test('enums read unknown', () {
      final landing = LandingModel.fromJson(
        _object(_evolve(loadExample('landing'), enums: true)),
      ).toEntity();
      expect(landing.hero.layout, HeroLayout.unknown);
      final sections = landing.sections;
      expect(
        sections.whereType<HowItWorksSection>().single.steps.map(
          (s) => s.visual,
        ),
        everyElement(StepVisual.unknown),
      );
      expect(
        sections.whereType<FeaturesSection>().single.items.map(
          (i) => i.pointsAt,
        ),
        everyElement(FeaturePointsAt.unknown),
      );
      expect(
        sections.whereType<PersonaBandSection>().single.layout,
        PersonaBandLayout.unknown,
      );
      final cta = sections.whereType<CallToActionSection>().single;
      expect(cta.primary?.kind, CtaKind.unknown);
      expect(cta.secondary?.kind, CtaKind.unknown);

      final brief = BriefBuilderModel.fromJson(
        _object(_evolve(loadExample('brief-builder'), enums: true)),
      ).toEntity();
      expect(
        brief.builder!.slots.map((s) => s.kind),
        everyElement(SlotKind.unknown),
      );
    });

    test('an unknown section type gives UnknownSection', () {
      final example = loadExample('landing');
      final types = {
        for (final s in example['sections']! as List<Object?>)
          _object(s)['type']! as String,
      };
      final retyped = _object(example)
        ..['sections'] = _retype(example['sections'], types);

      final landing = LandingModel.fromJson(retyped).toEntity();

      expect(landing.sections, hasLength(types.length));
      expect(landing.sections, everyElement(isA<UnknownSection>()));
      expect(
        landing.sections.map((s) => (s as UnknownSection).type),
        everyElement(_future),
      );
    });

    test('unknown rich node types give UnknownBlock and UnknownInline', () {
      final example = loadExample('landing');
      final sections = [
        for (final s in example['sections']! as List<Object?>)
          if (_object(s)['type'] == 'richText')
            {
              ..._object(s),
              'content': _retype(_object(s)['content'], {'quote', 'heading'}),
            }
          else if (_object(s)['type'] == 'faq')
            _retype(s, {'text', 'link', 'lineBreak'})
          else
            s,
      ];

      final landing = LandingModel.fromJson({...example, 'sections': sections})
          .toEntity();

      final rich = landing.sections.whereType<RichTextSection>().single;
      expect(rich.content.nodes, contains(const UnknownBlock(_future)));
      final faq = landing.sections.whereType<FaqSection>().single;
      final inlines = [
        for (final item in faq.items)
          for (final block in item.answer.nodes)
            if (block is ParagraphBlock) ...block.children,
      ];
      expect(inlines, isNotEmpty);
      expect(inlines, everyElement(const UnknownInline(_future)));
    });
  });
}
