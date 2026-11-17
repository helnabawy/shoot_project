import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/time/clock.dart';
import 'package:shoot_mobile/features/brief/domain/brief_receipt.dart';
import 'package:shoot_mobile/features/brief/domain/place.dart';
import 'package:shoot_mobile/features/brief/presentation/brief_cubit.dart';
import 'package:shoot_mobile/features/site/domain/entities/brief_builder.dart';

import '../../../helpers/brief_fixtures.dart';

/// Feature 022 in the app: with "Creators offer prices" on, a complete brief shows the price step,
/// pre-filled with the suggestion and kept within the range, and the price is sent with the brief.
void main() {
  const price = BriefPrice(
    persona: 'photographer',
    suggestedFils: 80000,
    minFils: 56000,
    maxFils: 160000,
  );

  const pin = PlacePin(
    lat: 24.4672,
    lng: 54.6031,
    area: 'Yas Island',
    emirate: 'Abu Dhabi',
    source: PlaceSource.search,
    placeId: 'yas',
  );

  Future<BriefCubit> ready(
    FakeBriefRepository repo, {
    bool offers = true,
    bool maps = false,
  }) async {
    final c = BriefCubit(
      loadBuilder: () async => Ok(
        BriefBuilder(
          locale: 'en',
          builder: fxConfig(),
          offersEnabled: offers,
          mapsEnabled: maps,
        ),
      ),
      repository: repo,
      clock: FixedClock(DateTime.utc(2026, 12, 5, 10)),
      isSignedIn: () => true,
    );
    await c.load();
    return c
      ..choose('persona', 'photographer')
      ..choose('occasion', 'wedding')
      ..choose('location', 'dubai');
  }

  group('OF-US1 the client names a price', () {
    test('OF-US1-S1 a complete brief first shows the price step with the suggestion', () async {
      final repo = FakeBriefRepository()..pricesResult = const Ok([price]);
      final c = await ready(repo);
      expect(c.state.offersEnabled, isTrue);
      await c.submit();
      expect(repo.recorded, isEmpty);
      expect(c.state.prices, [price]);
      expect(c.state.budgets, {'photographer': 80000});
    });

    test(
      'OF-US1-S3 a price is kept within the range, in whole dirhams',
      () async {
        final repo = FakeBriefRepository()..pricesResult = const Ok([price]);
        final c = await ready(repo);
        await c.submit();
        c.setBudget('photographer', 10000);
        expect(c.state.budgets['photographer'], 56000);
        c.setBudget('photographer', 999999);
        expect(c.state.budgets['photographer'], 160000);
        c.setBudget('photographer', 90050);
        expect(c.state.budgets['photographer'], 90000);
        c.setBudget('videographer', 90000);
        expect(c.state.budgets.containsKey('videographer'), isFalse);
      },
    );

    test(
      'OF-US1-S2 the second tap sends the brief with the chosen price',
      () async {
        final repo = FakeBriefRepository()..pricesResult = const Ok([price]);
        final c = await ready(repo);
        await c.submit();
        c.setBudget('photographer', 95000);
        await c.submit();
        expect(repo.recorded, hasLength(1));
        expect(repo.budgets.single, {'photographer': 95000});
        expect(c.state.receipt, fxReceipt);
      },
    );

    test('OF-US6-S1 with the switch off, the brief is sent at once without a price', () async {
      final repo = FakeBriefRepository();
      final c = await ready(repo, offers: false);
      await c.submit();
      expect(repo.recorded, hasLength(1));
      expect(repo.budgets.single, isNull);
    });

    test(
      'no prices from the server (switched off meanwhile) sends as before',
      () async {
        final repo = FakeBriefRepository();
        final c = await ready(repo);
        await c.submit();
        expect(repo.recorded, hasLength(1));
        expect(repo.budgets.single, isNull);
        expect(c.state.offersEnabled, isFalse);
      },
    );

    test('a failed price read shows the failure and sends nothing', () async {
      final repo = FakeBriefRepository()
        ..pricesResult = const Err(NetworkFailure());
      final c = await ready(repo);
      await c.submit();
      expect(repo.recorded, isEmpty);
      expect(c.state.submitting, isFalse);
    });

    test(
      'OF-US1-S4 with maps on, sending needs the place marked, and sends it',
      () async {
        final repo = FakeBriefRepository()..pricesResult = const Ok([price]);
        final c = await ready(repo, maps: true);
        await c.submit();
        expect(c.state.mapsEnabled, isTrue);
        await c.submit();
        expect(repo.recorded, isEmpty);
        expect(c.state.message, BriefMessage.placeNeeded);
        c.setPlace(pin);
        expect(c.state.message, isNull);
        await c.submit();
        expect(repo.recorded, hasLength(1));
        expect(repo.places.single, pin);
      },
    );

    test('with maps off, no place is asked or sent', () async {
      final repo = FakeBriefRepository()..pricesResult = const Ok([price]);
      final c = await ready(repo);
      await c.submit();
      await c.submit();
      expect(repo.places.single, isNull);
    });
  });
}
