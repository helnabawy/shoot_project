import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/brief/domain/place.dart';
import 'package:shoot_mobile/features/brief/presentation/place_sheet.dart';

import '../../../helpers/pump_app.dart';

class _Places implements PlaceRepository {
  @override
  Future<Result<List<PlaceSuggestion>>> search(String text, String s) async =>
      const Ok([
        PlaceSuggestion(
          placeId: 'yas',
          main: 'Yas Marina Circuit',
          secondary: 'Yas Island, Abu Dhabi',
        ),
      ]);

  @override
  Future<Result<PlaceReading>> pick(String placeId, String s) async => const Ok(
    PlaceReading(
      lat: 24.4672,
      lng: 54.6031,
      inside: true,
      area: 'Yas Island',
      emirate: 'Abu Dhabi',
    ),
  );

  @override
  Future<Result<PlaceReading>> reverse(double lat, double lng) async =>
      const Ok(PlaceReading(lat: 1, lng: 2, inside: false));
}

class _Denied implements DeviceLocator {
  @override
  Future<DeviceFix> locate() async => const DeviceDenied();
}

void main() {
  Future<void> open(WidgetTester tester, List<PlacePin?> result) async {
    tester.view.physicalSize = const Size(360, 1600);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    await tester.pumpApp(
      Builder(
        builder: (context) => Material(
          child: TextButton(
            onPressed: () async => result.add(
              await showPlaceSheet(
                context,
                repository: _Places(),
                locator: _Denied(),
              ),
            ),
            child: const Text('open'),
          ),
        ),
      ),
    );
    await tester.tap(find.text('open'));
    await tester.pump();
    await tester.pump(const Duration(seconds: 1));
  }

  group('OF-US1 boards 57–63', () {
    testWidgets(
      'OF-US1-S4a nothing marked, search, pick, confirm returns the pin',
      (tester) async {
        final result = <PlacePin?>[];
        await open(tester, result);
        expect(find.text('Where is it taking place?'), findsOneWidget);
        expect(
          find.text(
            'Nothing marked yet. Search for the place or use your location.',
          ),
          findsOneWidget,
        );
        await tester.enterText(find.byType(TextField), 'yas');
        await tester.pump(const Duration(seconds: 1));
        await tester.tap(find.text('Yas Marina Circuit'));
        await tester.pump(const Duration(seconds: 1));
        expect(find.text('Yas Island, Abu Dhabi'), findsOneWidget);
        await tester.tap(find.text('Use this place'));
        await tester.pump(const Duration(seconds: 1));
        expect(result.single?.area, 'Yas Island');
        expect(result.single?.source, PlaceSource.search);
      },
    );

    testWidgets('OF-US1-S4c a refused location says to search instead', (
      tester,
    ) async {
      await open(tester, []);
      await tester.tap(find.text('Use my location'));
      await tester.pump(const Duration(seconds: 1));
      expect(find.textContaining('location is off'), findsOneWidget);
    });
  });
}
