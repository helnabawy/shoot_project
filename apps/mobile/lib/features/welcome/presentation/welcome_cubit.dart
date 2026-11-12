import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shoot_mobile/core/content/creator_card.dart';
import 'package:shoot_mobile/core/content/sections.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/first_run/first_run_store.dart';
import 'package:shoot_mobile/features/landing/domain/entities/landing.dart';
import 'package:shoot_mobile/features/landing/domain/repositories/landing_repository.dart';
import 'package:shoot_mobile/features/site/domain/entities/brief_builder.dart';
import 'package:shoot_mobile/features/site/domain/repositories/site_repository.dart';

/// How many learning steps there are (boards 02 to 04).
const welcomeStepCount = 3;

enum WelcomeStatus { loading, ready, unavailable }

final class WelcomeState extends Equatable {
  const WelcomeState({
    this.status = WelcomeStatus.loading,
    this.steps = const [],
    this.creators = const [],
    this.builder,
  });

  final WelcomeStatus status;

  /// Exactly [welcomeStepCount] steps when ready: the landing's how-it-works steps (CMS).
  final List<HowItWorksStep> steps;

  /// Real listed creators for the demonstrations (research R1); never invented ones.
  final List<CreatorCard> creators;

  /// The brief builder, so the demonstrations use the editor's own placeholders and options.
  final BriefBuilderConfig? builder;

  @override
  List<Object?> get props => [status, steps, creators, builder];
}

/// The first visit (feature 010, US2). Step text comes from the landing's `howItWorks` section; if
/// it cannot be read (or has fewer than three steps) the steps are unavailable: they are skipped
/// this time and stay unseen so they show on the next plain launch (spec edge case).
class WelcomeCubit extends Cubit<WelcomeState> {
  WelcomeCubit({
    required this._landing,
    required this._site,
    required this._firstRun,
  }) : super(const WelcomeState());

  final LandingRepository _landing;
  final SiteRepository _site;
  final FirstRunStore _firstRun;

  Future<void> load() async {
    final results = await Future.wait([
      _landing.getLanding(),
      _site.getBriefBuilder(),
    ]);
    if (isClosed) return;
    final landing = results[0] as Result<Landing>;
    final builder = results[1] as Result<BriefBuilder>;
    if (landing is! Ok<Landing>) {
      return emit(const WelcomeState(status: WelcomeStatus.unavailable));
    }
    HowItWorksSection? how;
    CreatorNetworkSection? network;
    for (final s in landing.value.sections) {
      if (s is HowItWorksSection) how ??= s;
      if (s is CreatorNetworkSection) network ??= s;
    }
    final steps = how?.steps ?? const <HowItWorksStep>[];
    if (steps.length < welcomeStepCount) {
      return emit(const WelcomeState(status: WelcomeStatus.unavailable));
    }
    emit(
      WelcomeState(
        status: WelcomeStatus.ready,
        steps: steps.take(welcomeStepCount).toList(),
        creators: network?.creators.take(2).toList() ?? const [],
        builder: builder is Ok<BriefBuilder> ? builder.value.builder : null,
      ),
    );
  }

  bool get seen => _firstRun.welcomeSeen;

  /// Skipping or finishing marks the steps as seen on this device (FR-005).
  Future<void> markSeen() => _firstRun.markWelcomeSeen();
}
