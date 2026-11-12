import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shoot_mobile/core/content/sections.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/landing/domain/entities/landing.dart';
import 'package:shoot_mobile/features/landing/domain/repositories/landing_repository.dart';
import 'package:shoot_mobile/features/site/domain/entities/site_info.dart';
import 'package:shoot_mobile/features/site/domain/repositories/site_repository.dart';

/// The creator strip shows at least this many cards, the number a 360 px strip shows at once.
/// Fewer and the section is left out, with no placeholder cards (spec FR-022, research R4). A
/// layout constant, not content: site settings has no such field yet.
const kMinStripCreators = 4;

/// The landing's four designed sections, picked from the CMS landing page (research R2): the first
/// section of each type, in the app's fixed order. Anything else is not drawn.
final class LandingSections extends Equatable {
  const LandingSections({
    this.occasions,
    this.creators,
    this.band,
    this.closing,
    this.howItWorks,
  });

  factory LandingSections.from(Landing landing) {
    CategoriesGridSection? occasions;
    CreatorNetworkSection? creators;
    PersonaBandSection? band;
    CallToActionSection? closing;
    HowItWorksSection? how;
    for (final s in landing.sections) {
      switch (s) {
        case CategoriesGridSection()
            when occasions == null && s.tiles.isNotEmpty:
          occasions = s;
        case CreatorNetworkSection()
            when creators == null && s.creators.length >= kMinStripCreators:
          creators = s;
        case PersonaBandSection() when band == null:
          band = s;
        case CallToActionSection() when closing == null:
          closing = s;
        case HowItWorksSection() when how == null:
          how = s;
        default:
      }
    }
    return LandingSections(
      occasions: occasions,
      creators: creators,
      band: band,
      closing: closing,
      howItWorks: how,
    );
  }

  final CategoriesGridSection? occasions;
  final CreatorNetworkSection? creators;
  final PersonaBandSection? band;
  final CallToActionSection? closing;

  /// Feeds the learning steps (feature 010, research R1); not drawn on the landing.
  final HowItWorksSection? howItWorks;

  @override
  List<Object?> get props => [occasions, creators, band, closing, howItWorks];
}

enum LandingStatus { loading, ready, failed }

final class LandingState extends Equatable {
  const LandingState({
    this.status = LandingStatus.loading,
    this.landing,
    this.sections = const LandingSections(),
    this.site,
  });

  final LandingStatus status;
  final Landing? landing;
  final LandingSections sections;

  /// For the WhatsApp fallback when the bar cannot be shown; `null` when it could not be read.
  final SiteInfo? site;

  @override
  List<Object?> get props => [status, landing, sections, site];
}

/// Loads the landing and the site settings in the app's current language; `load()` again after a
/// language change re-reads both (spec US3-S2).
class LandingCubit extends Cubit<LandingState> {
  LandingCubit({required this._landing, required this._site})
    : super(const LandingState());

  final LandingRepository _landing;
  final SiteRepository _site;

  Future<void> load() async {
    // Keep what is on screen while a reload runs; only the first load shows the spinner.
    if (state.landing == null) emit(const LandingState());
    final results = await Future.wait([_landing.getLanding(), _site.getSite()]);
    if (isClosed) return;
    final landing = results[0] as Result<Landing>;
    final site = results[1] as Result<SiteInfo>;
    switch (landing) {
      case Ok(:final value):
        emit(
          LandingState(
            status: LandingStatus.ready,
            landing: value,
            sections: LandingSections.from(value),
            site: site is Ok<SiteInfo> ? site.value : null,
          ),
        );
      case Err():
        // A reload that fails keeps the page that is already there.
        if (state.landing == null) {
          emit(const LandingState(status: LandingStatus.failed));
        }
    }
  }
}
