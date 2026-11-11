import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/content/cta.dart';
import 'package:shoot_mobile/core/content/rich_text.dart';
import 'package:shoot_mobile/core/content/sections.dart';
import 'package:shoot_mobile/core/network/json_read.dart';

import '../../helpers/api_examples.dart';

void main() {
  group('MR-US1-S5 sections', () {
    final raw = readList(loadExample('landing'), 'sections', asObject);
    final sections = [
      for (final json in raw) SectionModel.fromJson(json).toEntity(),
    ];

    test('every section type in landing.json decodes to its case', () {
      final types = {for (final json in raw) json['type']};
      expect(types, {
        'howItWorks',
        'features',
        'categoriesGrid',
        'personaBand',
        'faq',
        'logoCloud',
        'richText',
        'callToAction',
        'creatorNetwork',
      });
      expect(sections.whereType<UnknownSection>(), isEmpty);
      expect(sections.map((s) => s.runtimeType).toSet(), hasLength(9));
    });

    test('section fields come through', () {
      final grid = sections.whereType<CategoriesGridSection>().single;
      expect(grid.anchor, 'specialties');
      expect(grid.tiles, isNotEmpty);
      expect(grid.tiles.first.category.slug, isNotEmpty);

      final network = sections.whereType<CreatorNetworkSection>().single;
      expect(network.creators.first.name, 'Omar K.');
      expect(network.creators.first.displayCode, 'SH-0087');

      final steps = sections.whereType<HowItWorksSection>().single.steps;
      expect(steps.first.visual, StepVisual.brief);

      final features = sections.whereType<FeaturesSection>().single;
      expect(features.items.first.pointsAt, FeaturePointsAt.sentence);

      final band = sections.whereType<PersonaBandSection>().single;
      expect(band.layout, PersonaBandLayout.combined);
      expect(band.personas, isNotEmpty);

      final faq = sections.whereType<FaqSection>().single;
      expect(faq.items.first.answer.nodes.first, isA<ParagraphBlock>());

      final logos = sections.whereType<LogoCloudSection>().single;
      expect(logos.anchor, isNull);
      expect(logos.logos.first.name, 'WhatsApp');

      final rich = sections.whereType<RichTextSection>().single;
      expect(rich.content.nodes.first, isA<HeadingBlock>());

      final cta = sections.whereType<CallToActionSection>().single;
      expect(cta.primary?.kind, CtaKind.link);
      expect(cta.primary?.path, '/#brief');
      expect(cta.secondary?.kind, CtaKind.whatsapp);
      expect(cta.secondary?.url, isNotNull);
    });

    test('an unknown type gives UnknownSection and reads nothing else', () {
      expect(
        SectionModel.fromJson({
          'type': 'testimonials',
          'anchor': 'quotes',
          'heading': 42,
        }).toEntity(),
        const UnknownSection(anchor: 'quotes', type: 'testimonials'),
      );
      expect(
        SectionModel.fromJson({'type': 'video', 'anchor': 7}).toEntity(),
        const UnknownSection(anchor: null, type: 'video'),
      );
    });

    test('a known type with a missing field throws FormatException', () {
      final faq = raw.firstWhere((s) => s['type'] == 'faq');
      expect(
        () => SectionModel.fromJson({...faq}..remove('heading')),
        throwsFormatException,
      );
      expect(
        () => SectionModel.fromJson({...faq, 'anchor': 3}),
        throwsFormatException,
      );
    });
  });
}
