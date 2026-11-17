import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/features/brief/data/brief_data.dart';
import 'package:shoot_mobile/features/brief/data/place_data.dart';
import 'package:shoot_mobile/features/brief/domain/brief_draft.dart';
import 'package:shoot_mobile/features/brief/domain/place.dart';

import '../../../helpers/api_examples.dart';
import '../../../helpers/brief_fixtures.dart';

void main() {
  group('OF-US1 the place over the API', () {
    test('OF-US1-S4a search answers decode to rows', () {
      final rows = placeSuggestionsFromJson(loadExample('place-autocomplete'));
      expect(rows.single.main, 'Yas Marina Circuit');
      expect(rows.single.secondary, 'Yas Island, Abu Dhabi');
    });

    test(
      'a point inside decodes with area and emirate; outside has neither',
      () {
        final inside = placeReadingFromJson(loadExample('place'));
        expect(inside.inside, isTrue);
        expect(inside.area, 'Yas Island');
        expect(inside.emirate, 'Abu Dhabi');
        final out = placeReadingFromJson(loadExample('place-outside'));
        expect(out.inside, isFalse);
        expect(out.area, isNull);
        expect(out.emirate, isNull);
      },
    );

    test('OF-US1-S4 the brief body carries the pin and how it was set; older bodies carry none', () {
      const draft = BriefDraft(
        values: {
          'persona': ['photographer'],
          'occasion': ['wedding'],
          'location': ['dubai'],
        },
        date: '2026-12-06',
      );
      final withPlace = briefRecordBody(
        fxConfig(),
        draft,
        place: const PlacePin(
          lat: 24.4672,
          lng: 54.6031,
          area: 'Yas Island',
          emirate: 'Abu Dhabi',
          source: PlaceSource.device,
        ),
      );
      expect(withPlace['place'], {
        'lat': 24.4672,
        'lng': 54.6031,
        'source': 'device',
      });
      expect(briefRecordBody(fxConfig(), draft).containsKey('place'), isFalse);
    });
  });
}
