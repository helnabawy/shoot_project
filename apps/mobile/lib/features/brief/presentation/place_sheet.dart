import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/widgets/inline_error.dart';
import 'package:shoot_mobile/core/widgets/shoot_field.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';
import 'package:shoot_mobile/core/widgets/shoot_panel.dart';
import 'package:shoot_mobile/core/widgets/text_link.dart';
import 'package:shoot_mobile/core/widgets/top_hit.dart';
import 'package:shoot_mobile/features/brief/domain/place.dart';
import 'package:shoot_mobile/features/brief/presentation/place_cubit.dart';

/// Boards 57–63 (feature 022): where the shoot is. Search, or "Use my location"; the server reads the area and
/// emirate. Returns the marked [PlacePin], or `null` when closed. Creators only ever see the area.
Future<PlacePin?> showPlaceSheet(
  BuildContext context, {
  required PlaceRepository repository,
  required DeviceLocator locator,
  PlacePin? current,
  String? emirateName,
  bool showMap = true,
}) {
  return showModalBottomSheet<PlacePin>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => BlocProvider(
      create: (_) {
        final cubit = PlaceCubit(
          repository: repository,
          locator: locator,
          initial: current,
        );
        if (showMap) unawaited(cubit.focusOn(emirateName));
        return cubit;
      },
      child: PlaceSheet(showMap: showMap),
    ),
  );
}

class PlaceSheet extends StatefulWidget {
  const PlaceSheet({super.key, this.showMap = true});

  /// Off in widget tests, which have no network for map tiles.
  final bool showMap;

  @override
  State<PlaceSheet> createState() => _PlaceSheetState();
}

class _PlaceSheetState extends State<PlaceSheet> {
  final _search = TextEditingController();

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: ShootSheet(
        label: l10n.briefPlaceLabel,
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: BlocBuilder<PlaceCubit, PlaceState>(
              builder: (context, state) {
                final cubit = context.read<PlaceCubit>();
                return Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  spacing: 12,
                  children: [
                    Text(
                      l10n.briefPlaceLabel,
                      style: ShootType.heading.copyWith(color: c.ink),
                    ),
                    if (widget.showMap) ...[
                      _PlaceMap(
                        pin: state.pin,
                        focus: state.focus,
                        label: l10n.briefPlaceMapLabel,
                        onTap: cubit.dropPin,
                      ),
                      _Meta(l10n.briefPlaceMapHint),
                    ],
                    if (state.pin case final pin?)
                      _Marked(pin: pin, onChange: cubit.clear)
                    else ...[
                      ShootField(
                        label: l10n.briefPlaceSearch,
                        controller: _search,
                        textInputAction: TextInputAction.search,
                        onChanged: cubit.search,
                      ),
                      _Notice(state: state),
                      for (final r in state.results)
                        _ResultRow(suggestion: r, onTap: () => cubit.choose(r)),
                      TextLink(
                        label: l10n.briefPlaceUseLocation,
                        onTap: state.busy ? null : cubit.useLocation,
                      ),
                    ],
                    _Meta(l10n.briefPlaceHint),
                    if (state.pin case final pin?)
                      TopHit(
                        label: l10n.briefPlaceConfirm,
                        onPressed: () => Navigator.of(context).pop(pin),
                      ),
                  ],
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}

/// The line under the search box for each state of boards 59–63.
class _Notice extends StatelessWidget {
  const _Notice({required this.state});

  final PlaceState state;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final text = switch (state.status) {
      PlaceStatus.empty => l10n.briefPlaceEmpty,
      PlaceStatus.results when state.results.isEmpty =>
        l10n.briefPlaceNoResults,
      PlaceStatus.locating => l10n.briefPlaceLocating,
      PlaceStatus.denied => l10n.briefPlaceDenied,
      PlaceStatus.outside => l10n.briefPlaceOutside,
      PlaceStatus.failed => l10n.briefPlaceFailed,
      _ => null,
    };
    if (text == null) return const SizedBox.shrink();
    final problem = switch (state.status) {
      PlaceStatus.denied || PlaceStatus.outside || PlaceStatus.failed => true,
      _ => false,
    };
    return problem ? InlineError(text) : _Meta(text);
  }
}

class _ResultRow extends StatelessWidget {
  const _ResultRow({required this.suggestion, required this.onTap});

  final PlaceSuggestion suggestion;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
        child: Row(
          spacing: 12,
          children: [
            ShootIcon(ShootIcons.pin, size: 18, color: c.mute),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    suggestion.main,
                    style: ShootType.body.copyWith(color: c.ink),
                  ),
                  if (suggestion.secondary.isNotEmpty)
                    Text(
                      suggestion.secondary,
                      style: ShootType.meta.copyWith(color: c.mute),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Board 57: the marked place, as the area and emirate, with a way to take it back.
class _Marked extends StatelessWidget {
  const _Marked({required this.pin, required this.onChange});

  final PlacePin pin;
  final VoidCallback onChange;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final comma = Localizations.localeOf(context).languageCode == 'ar'
        ? '، '
        : ', ';
    return Row(
      spacing: 12,
      children: [
        ShootIcon(ShootIcons.pin, size: 20, color: c.ink),
        Expanded(
          child: Text(
            [pin.area, pin.emirate].where((s) => s.isNotEmpty).join(comma),
            style: ShootType.body.copyWith(color: c.ink),
          ),
        ),
        TextLink(label: context.l10n.briefPlaceChange, onTap: onChange),
      ],
    );
  }
}

class _Meta extends StatelessWidget {
  const _Meta(this.text);

  final String text;

  @override
  Widget build(BuildContext context) =>
      Text(text, style: ShootType.meta.copyWith(color: context.colors.mute));
}

/// The whole country, until the brief's emirate is found.
const _uae = LatLng(24.6, 54.9);

/// Board 57: OpenStreetMap tiles (no key); a tap drops the pin and the server reads the area there. The pin is
/// the client's own and is never shown to creators.
class _PlaceMap extends StatefulWidget {
  const _PlaceMap({
    required this.pin,
    required this.focus,
    required this.label,
    required this.onTap,
  });

  final PlacePin? pin;
  final ({double lat, double lng})? focus;
  final String label;
  final void Function(double lat, double lng) onTap;

  @override
  State<_PlaceMap> createState() => _PlaceMapState();
}

class _PlaceMapState extends State<_PlaceMap> {
  final _controller = MapController();

  @override
  void didUpdateWidget(covariant _PlaceMap old) {
    super.didUpdateWidget(old);
    final pin = widget.pin;
    if (pin != null && pin != old.pin) {
      _controller.move(LatLng(pin.lat, pin.lng), 15);
    } else {
      final focus = widget.focus;
      if (pin == null && focus != null && focus != old.focus) {
        _controller.move(LatLng(focus.lat, focus.lng), 11);
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final pin = widget.pin;
    final focus = widget.focus;
    final start = pin != null
        ? LatLng(pin.lat, pin.lng)
        : focus != null
        ? LatLng(focus.lat, focus.lng)
        : _uae;
    return Semantics(
      label: widget.label,
      container: true,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: SizedBox(
          height: 220,
          child: FlutterMap(
            mapController: _controller,
            options: MapOptions(
              initialCenter: start,
              initialZoom: pin != null
                  ? 15
                  : focus != null
                  ? 11
                  : 7,
              onTap: (_, at) => widget.onTap(at.latitude, at.longitude),
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'ae.shoot.mobile',
              ),
              if (pin != null)
                MarkerLayer(
                  markers: [
                    Marker(
                      point: LatLng(pin.lat, pin.lng),
                      width: 24,
                      height: 24,
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          color: const Color(0xFFE0141A),
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 3),
                        ),
                      ),
                    ),
                  ],
                ),
              const RichAttributionWidget(
                attributions: [
                  TextSourceAttribution('OpenStreetMap contributors'),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
