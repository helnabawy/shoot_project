import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/features/creator_account/data/models/creator_account_models.dart';
import 'package:shoot_mobile/features/creator_account/domain/entities/creator_account.dart';

import '../fixtures.dart';

void main() {
  group('MW-US1-S1 the profile answer', () {
    test('a draft shows seven steps, strength and what is missing', () {
      final p = profileExample('creator-profile-draft');
      expect(p.steps, hasLength(7));
      expect(p.strength, 43);
      expect(p.canSubmit, isFalse);
      expect(p.needing.map((s) => s.key), [
        StepKey.about,
        StepKey.places,
        StepKey.identity,
      ]);
      expect(p.step(StepKey.about).required, ['gender']);
      expect(p.status, ProfileStatus.draft);
    });

    test('a ready profile can be sent; a sent one reads as in review', () {
      expect(profileExample('creator-profile-ready').canSubmit, isTrue);
      final sent = profileExample('creator-profile-review');
      expect(sent.status, ProfileStatus.inReview);
      expect(sent.submittedAt, isNotNull);
    });

    test('an unknown status or step state decodes to a safe case', () {
      expect(ProfileStatus.fromWire('retired'), ProfileStatus.draft);
      expect(StepState.fromWire('x'), StepState.recommended);
      expect(IdentityState.fromWire('x'), IdentityState.missing);
    });

    test('a patch only carries the fields of the steps being left', () {
      final fields = profileExample('creator-profile-ready').fields;
      final patch = fields.toPatch({StepKey.about});
      expect(patch.keys, ['gender', 'nationality', 'yearsExperience']);
      expect(patch['gender'], 'man');
      expect(const ProfileFields().toPatch({StepKey.about}).keys, [
        'nationality',
        'yearsExperience',
      ]);
    });

    test('MW-US1-S9 a field error names the step it belongs to', () {
      expect(StepKey.ofField('body.gender'), StepKey.about);
      expect(StepKey.ofField('body.languages'), StepKey.places);
      expect(StepKey.ofField('body.social.0.url'), StepKey.links);
      expect(StepKey.ofField('nothing'), isNull);
    });
  });

  group('MW-US2-S8 the requests', () {
    test('carry the client by first name and no phone number', () {
      final b = bookingsExample();
      final r = b.waiting.single;
      expect(r.client, 'Layla');
      expect(r.answer, RequestAnswer.pending);
      expect(r.respondBy, isNotNull);
      expect(b.updates.single.read, isFalse);
    });
  });

  group('MW-US4-S1 availability', () {
    test('lists blocked and booked days and counts the blocked ones', () {
      final a = availabilityExample();
      expect(a.windowDays, 90);
      expect(a.kindOf(DateTime(2026, 11, 20)), DayKind.blocked);
      expect(a.kindOf(DateTime(2026, 11, 30)), DayKind.booked);
      expect(a.blockedCount, 1);
      expect(a.inWindow(DateTime(2027, 2, 9)), isTrue);
      expect(a.inWindow(DateTime(2027, 2, 10)), isFalse);
    });

    test('parseDay and dayString round trip and refuse text', () {
      expect(dayString(parseDay('2026-12-04')), '2026-12-04');
      expect(() => parseDay('4 Dec'), throwsFormatException);
    });
  });

  test('MW-US3-S1 the account answer', () {
    final a = accountExample();
    expect(a.needs.first.step, StepKey.about);
    expect(a.waiting, isNull);
    expect(a.blockedDays, 1);
  });
}
