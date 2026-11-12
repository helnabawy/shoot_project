import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/time/clock.dart';
import 'package:shoot_mobile/features/brief/presentation/brief_cubit.dart';
import 'package:shoot_mobile/features/site/domain/entities/brief_builder.dart';

import '../../../helpers/brief_fixtures.dart';

BriefCubit make(FakeBriefRepository repo, {BriefBuilder? builder}) =>
    BriefCubit(
      loadBuilder: () async =>
          Ok(builder ?? BriefBuilder(locale: 'en', builder: fxConfig())),
      repository: repo,
      clock: FixedClock(DateTime.utc(2026, 12, 5, 10)),
    );

Future<BriefCubit> ready(FakeBriefRepository repo) async {
  final c = make(repo);
  await c.load();
  return c;
}

void main() {
  test(
    'ML-US1-S1 the bar starts in its example state with no answers',
    () async {
      final c = await ready(FakeBriefRepository());
      expect(c.state.load, BriefLoad.ready);
      expect(c.state.example, isTrue);
      expect(c.state.draft.isEmpty, isTrue);
      expect(c.state.active, isNull);
    },
  );

  test(
    'ML-US1-S2 the first touch ends the example and opens step one',
    () async {
      final c = await ready(FakeBriefRepository());
      c.touch();
      expect(c.state.example, isFalse);
      expect(c.state.active, 'persona');
    },
  );

  test('ML-US1-S3 a choice shows the next unanswered step', () async {
    final c = await ready(FakeBriefRepository());
    c.touch();
    c.choose('persona', 'photographer');
    expect(c.state.active, 'persona'); // multiple: advances with Continue
    c.continueStep();
    expect(c.state.active, 'occasion');
    c.choose('occasion', 'wedding');
    expect(c.state.active, 'location');
  });

  test('ML-US1-S4 changing the type reopens the cleared step', () async {
    final c = await ready(FakeBriefRepository());
    c
      ..touch()
      ..choose('persona', 'videographer')
      ..continueStep()
      ..choose('occasion', 'reel')
      ..reopen('persona')
      ..choose('persona', 'photographer');
    expect(c.state.draft.valuesOf('occasion'), isEmpty);
    expect(c.state.active, 'occasion');
  });

  test('ML-US1-S5 an incomplete brief opens the first missing step and records nothing', () async {
    final repo = FakeBriefRepository();
    final c = await ready(repo);
    c.choose('persona', 'photographer');
    await c.submit();
    expect(repo.recorded, isEmpty);
    expect(c.state.active, 'occasion');
    expect(c.state.message, BriefMessage.missingStep);
    expect(c.state.messageToken, 'occasion');
  });

  test(
    'ML-US1-S6 a complete brief is recorded and a receipt is kept',
    () async {
      final repo = FakeBriefRepository();
      final c = await ready(repo);
      c
        ..choose('persona', 'photographer')
        ..choose('occasion', 'wedding')
        ..choose('location', 'dubai');
      await c.submit();
      expect(repo.recorded.single.valuesOf('location'), ['dubai']);
      expect(c.state.receipt, fxReceipt);
      expect(c.state.draft.isEmpty, isTrue);
      c.acknowledge();
      expect(c.state.receipt, isNull);
    },
  );

  test('ML-US1-S7 a past date is refused with a one-line message', () async {
    final c = await ready(FakeBriefRepository());
    c.setDate('2026-12-04');
    expect(c.state.draft.date, isNull);
    expect(c.state.message, BriefMessage.pastDate);
    c.setDate('2026-12-05');
    expect(c.state.draft.date, '2026-12-05');
  });

  test(
    'ML-US1-S9 an occasion tile chooses that occasion and shows the next step',
    () async {
      final c = await ready(FakeBriefRepository());
      c.startWithOption('wedding');
      expect(c.state.draft.valuesOf('occasion'), ['wedding']);
      expect(c.state.active, 'persona');
      expect(c.state.example, isFalse);
    },
  );

  test('ML-US4-S2 an unknown tile value opens the first step', () async {
    final c = await ready(FakeBriefRepository());
    c.startWithOption('nope');
    expect(c.state.active, 'persona');
  });

  test(
    'ML-US1-S6 an option removed between load and send reopens its step',
    () async {
      final repo = FakeBriefRepository(
        const Err(
          ServerFailure(
            statusCode: 422,
            code: 'brief.errors.optionGone',
            fields: [(path: 'body.selections.occasion', code: 'x')],
          ),
        ),
      );
      final c = await ready(repo);
      c
        ..choose('persona', 'photographer')
        ..choose('occasion', 'wedding')
        ..choose('location', 'dubai');
      await c.submit();
      expect(c.state.message, BriefMessage.optionGone);
      expect(c.state.active, 'occasion');
      expect(c.state.submitting, isFalse);
      expect(c.state.draft.valuesOf('location'), [
        'dubai',
      ]); // nothing recorded, answers kept
    },
  );

  test('the hourly limit shows a plain message', () async {
    final repo = FakeBriefRepository(
      const Err(ServerFailure(statusCode: 429, code: 'brief.errors.tooMany')),
    );
    final c = await ready(repo);
    c
      ..choose('persona', 'photographer')
      ..choose('occasion', 'wedding')
      ..choose('location', 'dubai');
    await c.submit();
    expect(c.state.message, BriefMessage.rateLimited);
  });

  test('edge: no builder means the bar is off and nothing opens', () async {
    final c = make(
      FakeBriefRepository(),
      builder: const BriefBuilder(locale: 'en', builder: null),
    );
    await c.load();
    expect(c.state.load, BriefLoad.off);
    c.touch();
    expect(c.state.example, isTrue);
  });

  test(
    'edge: a failed load is reported, never hidden by built-in options',
    () async {
      final c = BriefCubit(
        loadBuilder: () async => const Err(NetworkFailure()),
        repository: FakeBriefRepository(),
        clock: const SystemClock(),
      );
      await c.load();
      expect(c.state.load, BriefLoad.failed);
      expect(c.state.config, isNull);
    },
  );

  test(
    'edge: a half-built brief survives a reload (language switch)',
    () async {
      final c = await ready(FakeBriefRepository());
      c.choose('persona', 'photographer');
      await c.load();
      expect(c.state.draft.valuesOf('persona'), ['photographer']);
    },
  );
}
