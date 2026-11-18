import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/features/creator_home/data/models/creator_home_model.dart';
import 'package:shoot_mobile/features/creator_home/domain/entities/creator_home.dart';

import '../../helpers/api_examples.dart';

void main() {
  CreatorHome decode(Map<String, Object?> json) =>
      CreatorHomeModel.fromJson(json).toEntity();

  group('CH-US1-S1 the live home', () {
    test('decodes the request queue in the order the server sends it', () {
      final home = decode(loadExample('creator-home'));
      expect(home.mode, HomeMode.live);
      expect(home.name, 'Omar K.');
      expect(home.code, 'SH-0087');
      expect(home.professions, ['Photographer']);
      expect(home.queue.map((i) => i.ref), [
        'Q-2026-0142',
        'B-7K2QX',
        'B-9QX4M',
      ]);
      final booking = home.queue.first as HomeBooking;
      expect(booking.client, 'Sara M.');
      expect(booking.time, '16:00');
      expect(booking.length, '4 hours');
      expect(booking.respondBy, DateTime.utc(2026, 11, 18, 14));
      expect(booking.key, 'Q-2026-0142');
      final brief = home.queue[1] as HomeBrief;
      expect(brief.persona, '1');
      expect(brief.budgetFils, 90000);
      expect(brief.key, 'B-7K2QX:1');
      expect((home.queue[2] as HomeBrief).date, isNull);
      expect((home.queue[2] as HomeBrief).budgetFils, isNull);
    });

    test('CH-US3-S2 reads the counts, the next shoot and today', () {
      final home = decode(loadExample('creator-home'));
      expect(
        home.counts,
        const HomeCounts(toAnswer: 3, comingUp: 1, completed: 4),
      );
      expect(home.next?.ref, 'Q-2026-0131');
      expect(home.next?.paid, isTrue);
      expect(home.today, TodayState.free);
      expect(home.reasons.map((r) => r.value), ['too-far', 'not-my-style']);
      expect(
        home.photo?.sizes.first.url,
        'https://shoot.example/media/omar-480.jpg',
      );
    });

    test('CH-US1-S7 an empty queue has no next request', () {
      final home = decode(loadExample('creator-home-clear'));
      expect(home.queue, isEmpty);
      expect(home.counts?.toAnswer, 0);
    });
  });

  group('CH-US4-S3 a creator who is not live', () {
    test('has the missing steps, no counts and no queue', () {
      final home = decode(loadExample('creator-home-not-live'));
      expect(home.mode, HomeMode.incomplete);
      expect(home.counts, isNull);
      expect(home.queue, isEmpty);
      expect(home.next, isNull);
      expect(home.photo, isNull);
      expect(home.needs.map((n) => (n.step, n.required)), [
        ('samples', true),
        ('places', true),
      ]);
    });
  });

  group('contracts/mobile-api.md what a newer server may add', () {
    test('an item whose kind this build does not know is left out', () {
      final json = loadExample('creator-home');
      final queue = (json['queue']! as List).cast<Map<String, Object?>>();
      final home = decode({
        ...json,
        'queue': [
          {...queue.first, 'kind': 'hologram'},
          ...queue.skip(1),
        ],
      });
      expect(home.queue.map((i) => i.ref), ['B-7K2QX', 'B-9QX4M']);
    });

    test('an unknown mode reads as incomplete', () {
      expect(
        decode({...loadExample('creator-home-not-live'), 'mode': 'archived'})
            .mode,
        HomeMode.incomplete,
      );
    });

    test('an unknown today reads as free', () {
      expect(
        decode({...loadExample('creator-home'), 'today': 'away'}).today,
        TodayState.free,
      );
    });

    test('a malformed answer fails with a FormatException', () {
      expect(
        () => decode({...loadExample('creator-home'), 'name': 3}),
        throwsFormatException,
      );
    });
  });
}
