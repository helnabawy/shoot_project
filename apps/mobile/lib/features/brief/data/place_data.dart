import 'package:dio/dio.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shoot_mobile/core/error/api_result.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/network/api_get.dart';
import 'package:shoot_mobile/core/network/api_post.dart';
import 'package:shoot_mobile/core/network/json_read.dart';
import 'package:shoot_mobile/features/brief/domain/place.dart';

/// Decodes `placeAutocompleteV1`.
List<PlaceSuggestion> placeSuggestionsFromJson(Json json) =>
    readList(json, 'results', (o) {
      final r = asObject(o);
      return PlaceSuggestion(
        placeId: readString(r, 'placeId'),
        main: readString(r, 'main'),
        secondary: readString(r, 'secondary'),
      );
    });

/// Decodes `placeV1`.
PlaceReading placeReadingFromJson(Json json) {
  final emirate = json['emirate'];
  return PlaceReading(
    lat: (json['lat']! as num).toDouble(),
    lng: (json['lng']! as num).toDouble(),
    inside: readBool(json, 'inside'),
    area: readNullableString(json, 'area'),
    emirate: emirate is Map ? readString(asObject(emirate), 'name') : null,
  );
}

final class PlaceRepositoryImpl implements PlaceRepository {
  const PlaceRepositoryImpl(this._dio);

  final Dio _dio;

  @override
  Future<Result<List<PlaceSuggestion>>> search(String text, String session) =>
      apiResult(() async {
        final answer = await apiPost(
          _dio,
          'places/autocomplete',
          body: {'q': text, 'sessionToken': session},
        );
        return placeSuggestionsFromJson(answer.body ?? const {});
      });

  @override
  Future<Result<PlaceReading>> pick(String placeId, String session) =>
      apiResult(
        () async => placeReadingFromJson(
          await apiGet(
            _dio,
            'places/${Uri.encodeComponent(placeId)}',
            query: {'sessionToken': session},
          ),
        ),
      );

  @override
  Future<Result<PlaceReading>> reverse(double lat, double lng) =>
      apiResult(() async {
        final answer = await apiPost(
          _dio,
          'places/reverse',
          body: {'lat': lat, 'lng': lng},
        );
        return placeReadingFromJson(answer.body ?? const {});
      });
}

/// The device's location through the platform; asked only when the person taps "Use my location".
final class GeolocatorLocator implements DeviceLocator {
  const GeolocatorLocator();

  @override
  Future<DeviceFix> locate() async {
    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        return const DeviceDenied();
      }
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        return const DeviceDenied();
      }
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          timeLimit: Duration(seconds: 10),
        ),
      );
      return DeviceAt(position.latitude, position.longitude);
    } on Object {
      return const DeviceDenied();
    }
  }
}
