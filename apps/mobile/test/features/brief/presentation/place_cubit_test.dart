import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/brief/domain/place.dart';
import 'package:shoot_mobile/features/brief/presentation/place_cubit.dart';

class _Places implements PlaceRepository {
  Result<List<PlaceSuggestion>> found = const Ok([
    PlaceSuggestion(
      placeId: 'yas',
      main: 'Yas Marina Circuit',
      secondary: 'Yas Island, Abu Dhabi',
    ),
  ]);
  Result<PlaceReading> reading = const Ok(
    PlaceReading(
      lat: 24.4672,
      lng: 54.6031,
      inside: true,
      area: 'Yas Island',
      emirate: 'Abu Dhabi',
    ),
  );
  final searches = <String>[];

  @override
  Future<Result<List<PlaceSuggestion>>> search(
    String text,
    String session,
  ) async {
    searches.add(text);
    return found;
  }

  @override
  Future<Result<PlaceReading>> pick(String placeId, String session) async =>
      reading;

  @override
  Future<Result<PlaceReading>> reverse(double lat, double lng) async => reading;
}

class _Locator implements DeviceLocator {
  DeviceFix fix = const DeviceAt(24.4672, 54.6031);

  @override
  Future<DeviceFix> locate() async => fix;
}

void main() {
  late _Places places;
  late _Locator locator;
  PlaceCubit make() =>
      PlaceCubit(repository: places, locator: locator, debounce: Duration.zero);

  setUp(() {
    places = _Places();
    locator = _Locator();
  });

  group('OF-US1 the place step', () {
    test(
      'OF-US1-S4a nothing marked, then search results, then a marked place',
      () async {
        final cubit = make();
        expect(cubit.state.status, PlaceStatus.empty);
        cubit.search('yas');
        await Future<void>.delayed(const Duration(milliseconds: 20));
        expect(cubit.state.status, PlaceStatus.results);
        expect(cubit.state.results.single.main, 'Yas Marina Circuit');
        await cubit.choose(cubit.state.results.single);
        expect(cubit.state.status, PlaceStatus.marked);
        expect(
          cubit.state.pin,
          const PlacePin(
            lat: 24.4672,
            lng: 54.6031,
            area: 'Yas Island',
            emirate: 'Abu Dhabi',
            source: PlaceSource.search,
            placeId: 'yas',
          ),
        );
        cubit.clear();
        expect(cubit.state.pin, isNull);
        await cubit.close();
      },
    );

    test('a very short search shows nothing and asks nothing', () async {
      final cubit = make();
      cubit.search('y');
      await Future<void>.delayed(const Duration(milliseconds: 20));
      expect(cubit.state.status, PlaceStatus.empty);
      expect(places.searches, isEmpty);
      await cubit.close();
    });

    test(
      'OF-US1-S4 a place outside the emirates served is not taken',
      () async {
        places.reading = const Ok(
          PlaceReading(lat: 25.28, lng: 51.53, inside: false),
        );
        final cubit = make();
        await cubit.choose(
          const PlaceSuggestion(
            placeId: 'doha',
            main: 'Doha',
            secondary: 'Qatar',
          ),
        );
        expect(cubit.state.status, PlaceStatus.outside);
        expect(cubit.state.pin, isNull);
        await cubit.close();
      },
    );

    test(
      'OF-US1-S4c "Use my location": allowed marks the place; refused says so',
      () async {
        final cubit = make();
        await cubit.useLocation();
        expect(cubit.state.pin?.source, PlaceSource.device);
        cubit.clear();
        locator.fix = const DeviceDenied();
        await cubit.useLocation();
        expect(cubit.state.status, PlaceStatus.denied);
        expect(cubit.state.busy, isFalse);
        await cubit.close();
      },
    );

    test('a place service that cannot be reached is a failed state, search or pick', () async {
      places.found = const Err(NetworkFailure());
      places.reading = const Err(NetworkFailure());
      final cubit = make();
      cubit.search('yas');
      await Future<void>.delayed(const Duration(milliseconds: 20));
      expect(cubit.state.status, PlaceStatus.failed);
      await cubit.choose(
        const PlaceSuggestion(placeId: 'x', main: 'X', secondary: ''),
      );
      expect(cubit.state.status, PlaceStatus.failed);
      await cubit.close();
    });

    test(
      'a marked place is the starting point when the sheet reopens',
      () async {
        const pin = PlacePin(
          lat: 1,
          lng: 2,
          area: 'A',
          emirate: 'E',
          source: PlaceSource.drag,
        );
        final cubit = PlaceCubit(
          repository: places,
          locator: locator,
          initial: pin,
        );
        expect(cubit.state.status, PlaceStatus.marked);
        expect(cubit.state.pin, pin);
        await cubit.close();
      },
    );
  });
}
