import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/features/creator_account/domain/entities/inbox.dart';

import '../fixtures.dart';

void main() {
  group('BI-US1-S7 the inbox answers decode', () {
    test(
      'open briefs: content words, date or "to agree", no client details',
      () {
        final inbox = inboxExample();
        expect(inbox.open, hasLength(2));
        final first = inbox.open.first;
        expect(first.ref, 'BR-7K2Q');
        expect(first.profession, 'Photographer');
        expect(first.emirate, 'Dubai');
        expect(first.date, DateTime(2026, 11, 20));
        expect(first.answer, isNull);
        expect(first.outcome, BriefOutcome.open);
        expect(inbox.open.last.date, isNull);
        expect(inbox.reasons.map((r) => r.value), [
          'not-free',
          'too-far',
          'not-my-work',
          'other',
        ]);
      },
    );

    test('answered briefs keep the answer and the reason label', () {
      final inbox = inboxExample('creator-briefs-answered');
      expect(inbox.accepted.single.answer, BriefAnswer.accepted);
      expect(inbox.rejected.single.reason, 'too-far');
      expect(inbox.reasonLabel('too-far'), 'Too far');
      expect(inbox.reasonLabel('nope'), isNull);
    });

    test('BI-US1-S1 the account carries the briefs summary when live, none when draft', () {
      final live = accountWithBriefsExample();
      expect(live.briefs!.count, 2);
      expect(live.briefs!.soonest!.occasion, 'a birthday party');
      expect(accountExample().briefs, isNull);
    });

    test('outcomes read safely', () {
      expect(BriefOutcome.fromWire('other-creator'), BriefOutcome.otherCreator);
      expect(BriefOutcome.fromWire('booked-you'), BriefOutcome.bookedYou);
      expect(BriefOutcome.fromWire('closed'), BriefOutcome.closed);
      expect(BriefOutcome.fromWire('something-new'), BriefOutcome.open);
      expect(BriefAnswer.fromWire('rejected'), BriefAnswer.rejected);
      expect(BriefAnswer.fromWire(null), isNull);
    });
  });
}
