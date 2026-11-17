import 'package:equatable/equatable.dart';
import 'package:shoot_mobile/core/error/result.dart';

/// How the pin was set (feature 022): by searching, with the device's location, or by dragging.
enum PlaceSource { search, device, drag }

/// A place the client marked for the shoot (022, boards 57–63): the point, and the area and emirate the server
/// read for it. Creators only ever see the area; the exact point goes to the creator who is booked.
final class PlacePin extends Equatable {
  const PlacePin({
    required this.lat,
    required this.lng,
    required this.area,
    required this.emirate,
    required this.source,
    this.placeId,
  });

  final double lat;
  final double lng;
  final String area;
  final String emirate;
  final PlaceSource source;
  final String? placeId;

  @override
  List<Object?> get props => [lat, lng, area, emirate, source, placeId];
}

/// One row of search results (`places/autocomplete`).
final class PlaceSuggestion extends Equatable {
  const PlaceSuggestion({
    required this.placeId,
    required this.main,
    required this.secondary,
  });

  final String placeId;
  final String main;
  final String secondary;

  @override
  List<Object?> get props => [placeId, main, secondary];
}

/// What the server says about a point (`placeV1`): inside an emirate served, with its area, or not.
final class PlaceReading extends Equatable {
  const PlaceReading({
    required this.lat,
    required this.lng,
    required this.inside,
    this.area,
    this.emirate,
  });

  final double lat;
  final double lng;
  final bool inside;
  final String? area;
  final String? emirate;

  @override
  List<Object?> get props => [lat, lng, inside, area, emirate];
}

/// The place step's server calls (022, R15). The server holds the map keys; the app never does.
abstract interface class PlaceRepository {
  Future<Result<List<PlaceSuggestion>>> search(String text, String session);

  Future<Result<PlaceReading>> pick(String placeId, String session);

  Future<Result<PlaceReading>> reverse(double lat, double lng);
}

/// Where the device is, when the person allows it (`Use my location`).
sealed class DeviceFix extends Equatable {
  const DeviceFix();

  @override
  List<Object?> get props => [];
}

final class DeviceAt extends DeviceFix {
  const DeviceAt(this.lat, this.lng);

  final double lat;
  final double lng;

  @override
  List<Object?> get props => [lat, lng];
}

/// Permission refused, location services off, or no fix in time.
final class DeviceDenied extends DeviceFix {
  const DeviceDenied();
}

abstract interface class DeviceLocator {
  Future<DeviceFix> locate();
}
