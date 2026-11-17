import 'dart:async';
import 'dart:math';

import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/brief/domain/place.dart';

/// What the place step shows (boards 58–63).
enum PlaceStatus {
  /// Nothing marked yet (59).
  empty,

  /// Search results are showing (60), or none were found.
  results,

  /// Waiting for the device's location.
  locating,

  /// The person said no, or location services are off (61).
  denied,

  /// The point is outside the emirates served (62).
  outside,

  /// The place service could not be reached (63): the emirate list is the way on.
  failed,

  /// A place is marked; the sheet can be confirmed (57).
  marked,
}

final class PlaceState extends Equatable {
  const PlaceState({
    this.status = PlaceStatus.empty,
    this.query = '',
    this.results = const [],
    this.pin,
    this.busy = false,
  });

  final PlaceStatus status;
  final String query;
  final List<PlaceSuggestion> results;
  final PlacePin? pin;

  /// A pick or a reading is in flight.
  final bool busy;

  PlaceState copyWith({
    PlaceStatus? status,
    String? query,
    List<PlaceSuggestion>? results,
    Object? pin = _keep,
    bool? busy,
  }) => PlaceState(
    status: status ?? this.status,
    query: query ?? this.query,
    results: results ?? this.results,
    pin: identical(pin, _keep) ? this.pin : pin as PlacePin?,
    busy: busy ?? this.busy,
  );

  @override
  List<Object?> get props => [status, query, results, pin, busy];
}

const _keep = Object();

/// Marks the shoot's place by searching or with the device's location (feature 022, US1, boards 57–63).
/// The server reads the area and emirate, and refuses a point outside the emirates served.
final class PlaceCubit extends Cubit<PlaceState> {
  PlaceCubit({
    required this._repository,
    required this._locator,
    PlacePin? initial,
    this.debounce = const Duration(milliseconds: 300),
  }) : _session = 's${Random().nextInt(1 << 31).toRadixString(36)}abcdef',
       super(
         initial == null
             ? const PlaceState()
             : PlaceState(status: PlaceStatus.marked, pin: initial),
       );

  final PlaceRepository _repository;
  final DeviceLocator _locator;
  final String _session;
  final Duration debounce;
  Timer? _timer;
  int _ticket = 0;

  /// The search box changed: results follow after a short pause.
  void search(String text) {
    _timer?.cancel();
    final query = text.trim();
    emit(state.copyWith(query: text));
    if (query.length < 2) {
      emit(state.copyWith(status: PlaceStatus.empty, results: const []));
      return;
    }
    final ticket = ++_ticket;
    _timer = Timer(debounce, () async {
      final found = await _repository.search(query, _session);
      if (isClosed || ticket != _ticket) return;
      switch (found) {
        case Ok(:final value):
          emit(state.copyWith(status: PlaceStatus.results, results: value));
        case Err():
          emit(state.copyWith(status: PlaceStatus.failed, results: const []));
      }
    });
  }

  /// A search result was tapped.
  Future<void> choose(PlaceSuggestion suggestion) async {
    emit(state.copyWith(busy: true));
    final result = await _repository.pick(suggestion.placeId, _session);
    if (isClosed) return;
    _settle(result, PlaceSource.search, placeId: suggestion.placeId);
  }

  /// "Use my location".
  Future<void> useLocation() async {
    emit(state.copyWith(status: PlaceStatus.locating, busy: true));
    final fix = await _locator.locate();
    if (isClosed) return;
    switch (fix) {
      case DeviceAt(:final lat, :final lng):
        _settle(await _repository.reverse(lat, lng), PlaceSource.device);
      case DeviceDenied():
        emit(state.copyWith(status: PlaceStatus.denied, busy: false));
    }
  }

  /// Takes back a marked place to search again.
  void clear() => emit(const PlaceState());

  void _settle(
    Result<PlaceReading> result,
    PlaceSource source, {
    String? placeId,
  }) {
    switch (result) {
      case Ok(:final value) when value.inside:
        emit(
          state.copyWith(
            status: PlaceStatus.marked,
            busy: false,
            results: const [],
            pin: PlacePin(
              lat: value.lat,
              lng: value.lng,
              area: value.area ?? '',
              emirate: value.emirate ?? '',
              source: source,
              placeId: placeId,
            ),
          ),
        );
      case Ok():
        emit(state.copyWith(status: PlaceStatus.outside, busy: false));
      case Err():
        emit(state.copyWith(status: PlaceStatus.failed, busy: false));
    }
  }

  @override
  Future<void> close() {
    _timer?.cancel();
    return super.close();
  }
}
