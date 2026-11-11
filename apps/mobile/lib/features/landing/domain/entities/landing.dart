import 'package:equatable/equatable.dart';
import 'package:shoot_mobile/core/content/cta.dart';
import 'package:shoot_mobile/core/content/sections.dart';
import 'package:shoot_mobile/core/media/image_ref.dart';

/// What the hero shows under its headline. A value this build does not know
/// reads as [unknown].
enum HeroLayout { briefBuilder, ctas, unknown }

/// The landing's hero (`heroV1`). Not `Hero`, which is a Flutter widget.
final class LandingHero extends Equatable {
  const LandingHero({
    required this.eyebrow,
    required this.headline,
    required this.subheadline,
    required this.trustChips,
    required this.layout,
    required this.primaryCta,
    required this.secondaryCta,
    required this.image,
    required this.imageMobile,
    required this.overlay,
    required this.overlayOpacity,
  });

  final String? eyebrow;
  final String headline;
  final String? subheadline;
  final List<String> trustChips;
  final HeroLayout layout;
  final Cta? primaryCta;
  final Cta? secondaryCta;
  final ImageRef? image;
  final ImageRef? imageMobile;
  final ImageRef? overlay;

  /// 0–100, or `null` when unset.
  final num? overlayOpacity;

  @override
  List<Object?> get props => [
    eyebrow,
    headline,
    subheadline,
    trustChips,
    layout,
    primaryCta,
    secondaryCta,
    image,
    imageMobile,
    overlay,
    overlayOpacity,
  ];
}

/// An in-page anchor: [target] is a section's `anchor`.
final class LandingAnchor extends Equatable {
  const LandingAnchor({required this.label, required this.target});

  final String label;
  final String target;

  @override
  List<Object?> get props => [label, target];
}

/// The landing (`landingV1`) in [locale]: the hero, its in-page navigation
/// and the sections in order (screens skip an `UnknownSection`).
final class Landing extends Equatable {
  const Landing({
    required this.locale,
    required this.hero,
    required this.navigation,
    required this.sections,
  });

  final String locale;
  final LandingHero hero;
  final List<LandingAnchor> navigation;
  final List<Section> sections;

  @override
  List<Object?> get props => [locale, hero, navigation, sections];
}
