import 'dart:io' show Platform;

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart' show LatLng;
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/widgets/icon_tile.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';
import 'package:shoot_mobile/features/creator_account/domain/entities/inbox.dart';
import 'package:url_launcher/url_launcher.dart';

/// The brief card's facts, built so a creator can decide at a glance: each fact names itself in a small
/// label above a value set in the row weight, so "When" and "Duration" read as answers, not as hints.
class BriefDetail extends StatelessWidget {
  const BriefDetail({
    super.key,
    required this.icon,
    required this.label,
    required this.value,
  });

  final ShootIcons icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      container: true,
      label: '$label, $value',
      excludeSemantics: true,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 52),
        child: Padding(
          padding: const EdgeInsetsDirectional.symmetric(vertical: 6),
          child: Row(
            spacing: 12,
            children: [
              IconTile(icon),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  spacing: 1,
                  children: [
                    Text(label, style: ShootType.meta.copyWith(color: c.mute)),
                    Text(
                      value,
                      style: ShootType.row.copyWith(
                        color: c.ink,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Where the shoot is, as a creator may see it before booking (022 FR-005b): a small map of the area's
/// public point with a rough circle (never the client's pin), the area and the distance, and one tap to
/// open the same point in the phone's maps app.
class BriefPlaceView extends StatelessWidget {
  const BriefPlaceView({
    super.key,
    required this.place,
    required this.onOpen,
    this.tiles = true,
  });

  final BriefPlace place;
  final VoidCallback? onOpen;

  /// `false` draws the board's plain map (roads and the area) without fetching OpenStreetMap tiles.
  final bool tiles;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    final comma = Localizations.localeOf(context).languageCode == 'ar'
        ? '، '
        : ', ';
    final area = [
      place.area,
      place.emirate,
    ].where((s) => s.isNotEmpty).join(comma);
    final distance = place.distanceKm == null
        ? l10n.inboxOfferSetBase
        : l10n.inboxOfferDistance(place.distanceKm!);
    return Semantics(
      button: onOpen != null,
      label: '${l10n.caFactWhere}, $area, $distance',
      hint: onOpen == null ? null : l10n.inboxOpenMap,
      excludeSemantics: true,
      child: Material(
        type: MaterialType.transparency,
        child: InkWell(
          key: const Key('inbox-place'),
          onTap: onOpen,
          borderRadius: BorderRadius.circular(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (place.point case final point?)
                BriefMap(point: point, tiles: tiles),
              Padding(
                padding: const EdgeInsetsDirectional.only(top: 10, bottom: 4),
                child: Row(
                  spacing: 12,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (place.point == null) const IconTile(ShootIcons.pin),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        spacing: 2,
                        children: [
                          Text(
                            area,
                            style: ShootType.row.copyWith(
                              color: c.ink,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          Text(
                            distance,
                            style: ShootType.meta.copyWith(color: c.mute),
                          ),
                        ],
                      ),
                    ),
                    if (onOpen != null)
                      Padding(
                        padding: const EdgeInsetsDirectional.only(top: 1),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          spacing: 2,
                          children: [
                            Text(
                              l10n.inboxOpenMap,
                              style: ShootType.meta.copyWith(
                                color: c.accentInk,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            ShootIcon(
                              ShootIcons.chevron,
                              size: 14,
                              color: c.accentInk,
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Board S07h's `.map`: the area as a soft blue circle on the map, about a kilometre across, never a pin.
class BriefMap extends StatelessWidget {
  const BriefMap({super.key, required this.point, this.tiles = true});

  final ({double lat, double lng}) point;
  final bool tiles;

  static const _areaBlue = Color(0xFF0A60FF);

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final dark = Theme.of(context).brightness == Brightness.dark;
    final centre = LatLng(point.lat, point.lng);
    return ExcludeSemantics(
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: DecoratedBox(
          position: DecorationPosition.foreground,
          decoration: BoxDecoration(
            border: Border.all(color: c.hair),
            borderRadius: BorderRadius.circular(12),
          ),
          child: SizedBox(
            height: 132,
            child: Stack(
              fit: StackFit.expand,
              children: [
                // The board's drawn map: shown while tiles load, and alone when there are none.
                CustomPaint(painter: _RoadsPainter(dark: dark)),
                if (tiles)
                  // Tiles are dimmed in dark mode so the map sits in the panel instead of glaring.
                  _dimmed(
                    dark: dark,
                    child: FlutterMap(
                      options: MapOptions(
                        initialCenter: centre,
                        initialZoom: 12.5,
                        interactionOptions: const InteractionOptions(
                          flags: InteractiveFlag.none,
                        ),
                      ),
                      children: [
                        TileLayer(
                          urlTemplate:
                              'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                          userAgentPackageName: 'ae.shoot.mobile',
                        ),
                      ],
                    ),
                  ),
                Center(
                  child: Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: _areaBlue.withValues(alpha: 0.16),
                      border: Border.all(
                        color: _areaBlue.withValues(alpha: 0.6),
                        width: 2,
                      ),
                    ),
                  ),
                ),
                if (tiles)
                  PositionedDirectional(
                    end: 6,
                    bottom: 4,
                    child: Text(
                      '© OpenStreetMap',
                      textDirection: TextDirection.ltr,
                      style: ShootType.meta.copyWith(
                        fontSize: 10,
                        color: dark
                            ? const Color(0xFFA29D98)
                            : const Color(0xFF6B6560),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

Widget _dimmed({required bool dark, required Widget child}) => dark
    ? ColorFiltered(
        colorFilter: const ColorFilter.mode(
          Color(0xFF8A8A90),
          BlendMode.multiply,
        ),
        child: child,
      )
    : child;

/// Board S07h's `.map svg.roads`, scaled to the box: a land fill and three white roads.
class _RoadsPainter extends CustomPainter {
  const _RoadsPainter({required this.dark});

  final bool dark;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(
      Offset.zero & size,
      Paint()..color = dark ? const Color(0xFF2A2A2E) : const Color(0xFFE8E4DC),
    );
    final sx = size.width / 84;
    final sy = size.height / 64;
    final road = Paint()
      ..style = PaintingStyle.stroke
      ..color = dark ? const Color(0x33FFFFFF) : Colors.white;
    canvas
      ..drawPath(
        Path()
          ..moveTo(-2 * sx, 20 * sy)
          ..cubicTo(20 * sx, 18 * sy, 40 * sx, 30 * sy, 86 * sx, 24 * sy),
        road..strokeWidth = 4 * sy,
      )
      ..drawPath(
        Path()
          ..moveTo(30 * sx, -2 * sy)
          ..lineTo(38 * sx, 66 * sy),
        road..strokeWidth = 3 * sy,
      )
      ..drawPath(
        Path()
          ..moveTo(-2 * sx, 50 * sy)
          ..cubicTo(30 * sx, 44 * sy, 60 * sx, 56 * sy, 86 * sx, 48 * sy),
        road..strokeWidth = 3 * sy,
      );
  }

  @override
  bool shouldRepaint(_RoadsPainter old) => old.dark != dark;
}

/// The address that opens [place] in the phone's maps app: the public point when there is one (Apple
/// Maps on iOS, the `geo:` intent on Android, Google Maps on the web otherwise), else a search for the
/// area's name. Never the client's pin: the creator gets that only once booked.
Uri mapsUriFor(BriefPlace place, {TargetPlatform? platform}) {
  final name = [
    place.area,
    place.emirate,
  ].where((s) => s.isNotEmpty).join(', ');
  final os =
      platform ??
      (kIsWeb
          ? TargetPlatform.fuchsia
          : Platform.isIOS
          ? TargetPlatform.iOS
          : Platform.isAndroid
          ? TargetPlatform.android
          : TargetPlatform.fuchsia);
  final point = place.point;
  final at = point == null ? null : '${point.lat},${point.lng}';
  return switch (os) {
    TargetPlatform.iOS => Uri.https('maps.apple.com', '/', {
      'q': name,
      'll': ?at,
    }),
    TargetPlatform.android => Uri.parse(
      at == null
          ? 'geo:0,0?q=${Uri.encodeComponent(name)}'
          : 'geo:$at?q=${Uri.encodeComponent('$at($name)')}',
    ),
    _ => Uri.https('www.google.com', '/maps/search/', {
      'api': '1',
      'query': at ?? name,
    }),
  };
}

/// Opens [place] in the maps app, falling back to Google Maps in the browser.
Future<void> openPlaceInMaps(BriefPlace place) async {
  Future<bool> open(Uri uri) async {
    try {
      return await launchUrl(uri, mode: LaunchMode.externalApplication);
    } on Exception {
      return false;
    }
  }

  if (await open(mapsUriFor(place))) return;
  await open(mapsUriFor(place, platform: TargetPlatform.fuchsia));
}
