import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/time/clock.dart';
import 'package:shoot_mobile/features/brief/domain/brief_receipt.dart';
import 'package:shoot_mobile/features/brief/presentation/brief_cubit.dart';
import 'package:shoot_mobile/features/site/domain/entities/brief_builder.dart';

import '../../../helpers/brief_fixtures.dart';

/// Feature 021 in the app: a signed-out person's complete brief opens sign-in and is sent once they
/// are in (through `/brief/send`); nothing is recorded before.
void main() {
  var signedIn = false;

  Future<BriefCubit> ready(
    FakeBriefRepository repo, {
    bool required = true,
  }) async {
    final c = BriefCubit(
      loadBuilder: () async => Ok(
        BriefBuilder(
          locale: 'en',
          builder: fxConfig(),
          signInRequired: required,
        ),
      ),
      repository: repo,
      clock: FixedClock(DateTime.utc(2026, 12, 5, 10)),
      isSignedIn: () => signedIn,
    );
    await c.load();
    return c
      ..choose('persona', 'photographer')
      ..choose('occasion', 'wedding')
      ..choose('location', 'dubai');
  }

  setUp(() => signedIn = false);

  group('021 the app asks to sign in before a brief is sent', () {
    test('BS-US4-S1 signed out, a complete brief asks for sign-in and records nothing', () async {
      final repo = FakeBriefRepository();
      final c = await ready(repo);
      expect(c.state.signInRequired, isTrue);
      await c.submit();
      expect(repo.recorded, isEmpty);
      expect(c.state.signInNeeded, isTrue);
      expect(c.state.awaitingSignIn, isTrue);
      expect(c.state.draft.valuesOf('location'), ['dubai']);
      c.signInOpened();
      expect(c.state.signInNeeded, isFalse);
      expect(c.state.awaitingSignIn, isTrue);
    });

    test('BS-US4-S2 once signed in, /brief/send sends the kept draft once and a receipt follows', () async {
      final repo = FakeBriefRepository();
      final c = await ready(repo);
      await c.submit();
      c.signInOpened();
      signedIn = true;
      await c.sendAfterSignIn();
      expect(repo.recorded.single.valuesOf('occasion'), ['wedding']);
      expect(c.state.receipt, fxReceipt);
      expect(c.state.awaitingSignIn, isFalse);
      // A second visit to /brief/send (a router refresh) sends nothing more.
      await c.sendAfterSignIn();
      expect(repo.recorded, hasLength(1));
    });

    test('BS-US4-S4 leaving sign-in keeps the brief, and nothing is sent without the brief route', () async {
      final repo = FakeBriefRepository();
      final c = await ready(repo);
      await c.submit();
      c.signInOpened();
      // Still signed out when /brief/send is reached (a deep link): nothing.
      await c.sendAfterSignIn();
      expect(repo.recorded, isEmpty);
      expect(c.state.draft.valuesOf('location'), ['dubai']);
      // Never asked to send, a signed-in cubit never sends on its own.
      final other = await ready(repo);
      signedIn = true;
      await other.sendAfterSignIn();
      expect(repo.recorded, isEmpty);
    });

    test('BS-US4-S5 a signed-in member records at once', () async {
      signedIn = true;
      final repo = FakeBriefRepository();
      final c = await ready(repo);
      await c.submit();
      expect(repo.recorded, hasLength(1));
      expect(c.state.signInNeeded, isFalse);
      expect(c.state.receipt, fxReceipt);
    });

    test(
      'BS-US5-S3 with the switch off a signed-out person records as before',
      () async {
        final repo = FakeBriefRepository();
        final c = await ready(repo, required: false);
        await c.submit();
        expect(repo.recorded, hasLength(1));
        expect(c.state.signInNeeded, isFalse);
      },
    );

    test('BS-US6-S2 by default (the 2026-11-15 amendment) a signed-out brief is recorded and its step 2 link comes back', () async {
      const receipt = BriefReceipt(
        reference: 'B-2',
        sentence: 'I need a photographer.',
        whatsappUrl: null,
        matchPath: '/match/B-2/k',
      );
      final repo = FakeBriefRepository(const Ok(receipt));
      final c = await ready(repo, required: false);
      expect(c.state.signInRequired, isFalse);
      await c.submit();
      expect(repo.recorded, hasLength(1));
      expect(c.state.signInNeeded, isFalse);
      expect(c.state.awaitingSignIn, isFalse);
      expect(c.state.receipt?.matchPath, '/match/B-2/k');
    });

    test('BS-US5-S4 a "sign in required" answer (the switch turned on since) asks for sign-in, not an error', () async {
      final repo = FakeBriefRepository(
        const Err(
          ServerFailure(statusCode: 401, code: 'brief.errors.signInRequired'),
        ),
      );
      final c = await ready(repo, required: false);
      await c.submit();
      expect(c.state.message, isNull);
      expect(c.state.submitting, isFalse);
      expect(c.state.signInNeeded, isTrue);
      expect(c.state.signInRequired, isTrue);
      expect(c.state.draft.valuesOf('location'), ['dubai']);
    });
  });
}
