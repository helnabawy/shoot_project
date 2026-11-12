import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/features/creators/data/models/creator_models.dart';
import 'package:shoot_mobile/features/creators/domain/brief/brief_rules.dart';
import 'package:shoot_mobile/features/site/data/models/brief_builder_model.dart';
import 'package:shoot_mobile/features/site/domain/entities/brief_builder.dart';

import '../../../../helpers/api_examples.dart';

BriefBuilderConfig _config() =>
    BriefBuilderModel.fromJson(loadExample('brief-builder'))
        .toEntity()
        .builder!;

BriefCreator _omar() => BriefCreator.fromProfile(
  CreatorProfileModel.fromJson(loadExample('creator-profile')).toEntity(),
);

BriefCreator _creator({List<String>? personas, List<String>? places}) {
  final omar = _omar();
  return BriefCreator(
    code: omar.code,
    displayCode: omar.displayCode,
    name: omar.name,
    types: omar.types,
    personaSlugs: personas ?? omar.personaSlugs,
    places: places ?? omar.places,
  );
}

void main() {
  final config = _config();

  group('options', () {
    test('MC-US2-S1 persona options are limited to the creator types', () {
      final rules = BriefRules(
        config,
        creator: _creator(personas: ['videographer']),
      );
      final options = rules.options(config.slots[0], const {});
      expect(options.map((o) => o.value), ['videographer']);
    });

    test('MC-US2-S1 place options are limited to the creator emirates', () {
      final rules = BriefRules(config, creator: _omar());
      final options = rules.options(config.slots[2], const {});
      expect(options.map((o) => o.label), ['Dubai', 'Sharjah']);
    });

    test('options that apply to a persona show only for it', () {
      final plain = BriefRules(config);
      expect(
        plain
            .options(config.slots[1], {'persona': 'videographer'})
            .map((o) => o.value),
        ['wedding', 'event'],
      );
      expect(
        plain
            .options(config.slots[1], {'persona': 'photographer'})
            .map((o) => o.value),
        ['wedding', 'event', 'portrait'],
      );
    });
  });

  group('creator brief', () {
    test('MC-US2-S2 one offered type is already in the sentence', () {
      final rules = BriefRules(
        config,
        creator: _creator(personas: ['photographer']),
      );
      final values = rules.withFixed(const {});
      expect(values['persona'], 'photographer');
      expect(rules.nextOpen(values)?.token, 'occasion');
    });

    test('two offered types leave the type open', () {
      final rules = BriefRules(config, creator: _omar());
      expect(rules.nextOpen(rules.withFixed(const {}))?.token, 'persona');
    });

    test('a creator with no type the site offers cannot complete', () {
      final rules = BriefRules(config, creator: _creator(personas: const []));
      expect(rules.canComplete(const {}), isFalse);
    });

    test(
      'MC-US2-S5 answers a new creator cannot offer are dropped, the rest kept',
      () {
        final rules = BriefRules(
          config,
          creator: _creator(personas: ['photographer'], places: ['Dubai']),
        );
        final kept = rules.keepValid({
          'persona': 'videographer',
          'occasion': 'wedding',
          'location': 'sharjah',
        });
        expect(kept, {'occasion': 'wedding'});
      },
    );
  });

  group('completeness', () {
    final rules = BriefRules(config);

    test('required slots decide; the date is optional', () {
      expect(rules.isComplete(const {}), isFalse);
      final done = {
        'persona': 'photographer',
        'occasion': 'wedding',
        'location': 'dubai',
      };
      expect(rules.isComplete(done), isTrue);
      expect(rules.openCount({'persona': 'photographer'}), 2);
    });

    test(
      'a value that is not an option does not count; a typed occasion does',
      () {
        expect(
          rules.isComplete({
            'persona': 'teacher',
            'occasion': 'wedding',
            'location': 'dubai',
          }),
          isFalse,
        );
        expect(
          rules.isComplete({
            'persona': 'photographer',
            'occasion': 'my cousin\'s henna',
            'location': 'dubai',
          }),
          isTrue,
        );
      },
    );

    test('a past date is refused', () {
      final values = {
        'persona': 'photographer',
        'occasion': 'wedding',
        'location': 'dubai',
        'date': '2020-01-01',
      };
      expect(rules.isComplete(values, today: '2026-11-12'), isFalse);
      expect(
        rules.isComplete({
          ...values,
          'date': '2026-11-13',
        }, today: '2026-11-12'),
        isTrue,
      );
    });
  });

  group('sentence and message', () {
    final rules = BriefRules(config);
    final values = {'persona': 'photographer', 'occasion': 'wedding'};

    test('the sentence has a token per slot, set or with its placeholder', () {
      final parts = rules.sentence(values);
      final tokens = parts.whereType<SentenceToken>().toList();
      expect(tokens.map((t) => t.label), [
        'a photographer',
        'a wedding',
        'which emirate',
        'any date',
      ]);
      expect(tokens[0].isSet, isTrue);
      expect(tokens[2].isSet, isFalse);
    });

    test(
      'the message leaves out an unset optional date with its joining word',
      () {
        final message = rules.message({...values, 'location': 'dubai'});
        expect(message, 'Hi! I need a photographer for a wedding in Dubai.');
      },
    );

    test('the message names the creator on its own line when the template has no placeholder', () {
      final message = rules.message(
        {...values, 'location': 'dubai', 'date': '2026-11-21'},
        formatDate: (iso) => 'Sat 21 Nov',
        creatorLine: 'Creator: Omar K. (SH-0087)',
      );
      expect(
        message,
        'Hi! I need a photographer for a wedding in Dubai on Sat 21 Nov.\nCreator: Omar K. (SH-0087)',
      );
    });
  });

  test('firstName is the first word of the name', () {
    expect(_omar().firstName, 'Omar');
  });
}
