import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/auth/session_cubit.dart';
import 'package:shoot_mobile/core/content/audience.dart';
import 'package:shoot_mobile/core/content/creator_card.dart';
import 'package:shoot_mobile/core/content/sections.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/l10n/locale_cubit.dart';
import 'package:shoot_mobile/core/motion/ambient_pause.dart';
import 'package:shoot_mobile/core/preferences/preferences_store.dart';
import 'package:shoot_mobile/core/routing/app_router.dart';
import 'package:shoot_mobile/core/routing/error_page.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/time/clock.dart';
import 'package:shoot_mobile/core/web/website_links.dart';
import 'package:shoot_mobile/core/web/whatsapp_link.dart';
import 'package:shoot_mobile/core/widgets/golden_hour_scene.dart';
import 'package:shoot_mobile/core/widgets/language_action.dart';
import 'package:shoot_mobile/core/widgets/scene_tile.dart';
import 'package:shoot_mobile/core/widgets/shoot_header.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon_button.dart';
import 'package:shoot_mobile/core/widgets/shoot_image.dart';
import 'package:shoot_mobile/core/widgets/top_hit.dart';
import 'package:shoot_mobile/core/widgets/wordmark.dart';
import 'package:shoot_mobile/features/brief/presentation/brief_bar.dart';
import 'package:shoot_mobile/features/brief/presentation/brief_cubit.dart';
import 'package:shoot_mobile/features/landing/presentation/landing_cubit.dart';

/// The Pause choice, kept on the device (spec FR-031).
final class LandingMotionStore {
  const LandingMotionStore(this._store);

  final PreferencesStore _store;

  bool get paused =>
      _store.readString(PreferenceKeys.landingMotionPaused) == 'true';

  void save({required bool paused}) => unawaited(
    paused
        ? _store.writeString(PreferenceKeys.landingMotionPaused, 'true')
        : _store.remove(PreferenceKeys.landingMotionPaused),
  );
}

/// Screen 05, built to board `S01-landing`: one scrolling page. The hero carries the brief bar (the
/// one primary action); below it the four designed sections, their content from the CMS landing
/// page (research R2). The only screen with looping motion, all behind one Pause control.
class LandingPage extends StatefulWidget {
  const LandingPage({
    super.key,
    required this.landing,
    required this.brief,
    required this.motion,
    required this.clock,
    required this.links,
    this.open = openInBrowser,
  });

  final LandingCubit landing;
  final BriefCubit brief;
  final LandingMotionStore motion;
  final Clock clock;
  final WebsiteLinks links;
  final UrlOpener open;

  @override
  State<LandingPage> createState() => _LandingPageState();
}

class _LandingPageState extends State<LandingPage> {
  final _scroll = ScrollController();

  @override
  void initState() {
    super.initState();
    unawaited(widget.landing.load());
    unawaited(widget.brief.load());
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  void _reload() {
    unawaited(widget.landing.load());
    unawaited(widget.brief.load());
  }

  void _toHero() {
    if (!_scroll.hasClients) return;
    unawaited(
      _scroll.animateTo(
        0,
        duration: MediaQuery.disableAnimationsOf(context)
            ? Duration.zero
            : ShootMotion.slow,
        curve: ShootMotion.standard,
      ),
    );
  }

  Future<void> _openWhatsapp(String? number, String? message) async {
    if (number == null) return;
    final opened = await widget.open(
      WhatsappLink.native(number, message: message),
    );
    if (!opened) await widget.open(WhatsappLink.web(number, message: message));
  }

  /// A recorded brief: Quick Match step 2 once feature 012 has built it, else WhatsApp with the
  /// composed message and the reference (spec FR-016).
  void _onReceipt(BuildContext context, BriefState state) {
    final receipt = state.receipt;
    if (receipt == null) return;
    final matchBuilt = AppRoutes.table.any(
      (r) => r.path == '/match/:ref/:key' && r.built,
    );
    final path = receipt.matchPath;
    widget.brief.acknowledge();
    if (matchBuilt && path != null) {
      unawaited(context.push(path));
      return;
    }
    final url = receipt.whatsappUrl;
    if (url != null) unawaited(widget.open(Uri.parse(url)));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(context.l10n.mlBriefSentWhatsapp(receipt.reference)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return MultiBlocListener(
      listeners: [
        BlocListener<LocaleCubit, Locale?>(listener: (_, _) => _reload()),
        BlocListener<BriefCubit, BriefState>(
          listenWhen: (a, b) => a.receipt != b.receipt && b.receipt != null,
          listener: _onReceipt,
        ),
        BlocListener<BriefCubit, BriefState>(
          // "Start your brief" and the tiles return to the hero (spec US4-S1, S7).
          listenWhen: (a, b) => a.example && !b.example,
          listener: (_, _) => _toHero(),
        ),
      ],
      child: BlocBuilder<LandingCubit, LandingState>(
        bloc: widget.landing,
        builder: (context, state) {
          if (state.status == LandingStatus.failed) {
            return ErrorPage(
              onRetry: _reload,
              whatsappNumber: state.site?.whatsapp.number,
              onWhatsapp: () => unawaited(
                _openWhatsapp(
                  state.site?.whatsapp.number,
                  state.site?.whatsapp.defaultMessage,
                ),
              ),
            );
          }
          return AmbientPause(
            initiallyPaused: widget.motion.paused,
            onChanged: (p) => widget.motion.save(paused: p),
            child: Scaffold(
              backgroundColor: context.colors.ground,
              body: state.status == LandingStatus.loading
                  ? const SizedBox.shrink()
                  : _LandingView(
                      state: state,
                      brief: widget.brief,
                      scroll: _scroll,
                      clock: widget.clock,
                      onWhatsapp: () => unawaited(
                        _openWhatsapp(
                          state.site?.whatsapp.number,
                          state.site?.whatsapp.defaultMessage,
                        ),
                      ),
                    ),
            ),
          );
        },
      ),
    );
  }
}

class _LandingView extends StatelessWidget {
  const _LandingView({
    required this.state,
    required this.brief,
    required this.scroll,
    required this.clock,
    required this.onWhatsapp,
  });

  final LandingState state;
  final BriefCubit brief;
  final ScrollController scroll;
  final Clock clock;
  final VoidCallback onWhatsapp;

  @override
  Widget build(BuildContext context) {
    final sections = state.sections;
    final c = context.colors;
    return SingleChildScrollView(
      key: const ValueKey('landing:scroll'),
      controller: scroll,
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: ShootSize.maxColumn),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _Hero(
                state: state,
                brief: brief,
                clock: clock,
                onWhatsapp: onWhatsapp,
                // With no creators section the Pause control sits near the hero (spec FR-031).
                pauseNearHero: sections.creators == null,
              ),
              if (sections.occasions case final s?)
                _Occasions(section: s, brief: brief),
              if (sections.creators case final s?) _Creators(section: s),
              if (sections.band case final s?) _Band(section: s),
              if (sections.closing case final s?)
                _Closing(section: s, brief: brief),
              SizedBox(height: MediaQuery.paddingOf(context).bottom + 32),
              ColoredBox(color: c.ground),
            ],
          ),
        ),
      ),
    );
  }
}

class _Hero extends StatelessWidget {
  const _Hero({
    required this.state,
    required this.brief,
    required this.clock,
    required this.onWhatsapp,
    required this.pauseNearHero,
  });

  final LandingState state;
  final BriefCubit brief;
  final Clock clock;
  final VoidCallback onWhatsapp;
  final bool pauseNearHero;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    final hero = state.landing!.hero;
    final session = context.watch<SessionCubit>().state;
    return Stack(
      children: [
        const Positioned(
          top: 0,
          left: 0,
          right: 0,
          height: 650,
          child: GoldenHourScene(),
        ),
        SafeArea(
          bottom: false,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              ShootHeader(
                leading: Wordmark(label: l10n.appTitle),
                trailing: [
                  const LanguageAction(),
                  ShootIconButton(
                    icon: ShootIcons.person,
                    label: l10n.mlAccountButton,
                    onPressed: () => unawaited(
                      context.push(
                        session is SignedIn
                            ? afterSignIn(session.user)
                            : AppRoutes.login,
                      ),
                    ),
                  ),
                  ShootIconButton(
                    icon: ShootIcons.menu,
                    label: l10n.mlOpenMenu,
                    onPressed: () => unawaited(context.push('/menu')),
                  ),
                ],
              ),
              Padding(
                padding: const EdgeInsetsDirectional.fromSTEB(20, 22, 20, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      hero.headline,
                      style: ShootType.display.copyWith(
                        fontSize: 46,
                        height: 1,
                        letterSpacing: -0.035 * 46,
                        color: c.ink,
                      ),
                    ),
                    if (hero.subheadline case final sub?)
                      Padding(
                        padding: const EdgeInsets.only(top: 14),
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 270),
                          child: Text(
                            sub,
                            style: ShootType.body.copyWith(
                              fontSize: 16,
                              height: 1.45,
                              color: c.bodyInk,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 28),
              Padding(
                padding: const EdgeInsetsDirectional.symmetric(horizontal: 12),
                child: BlocBuilder<BriefCubit, BriefState>(
                  bloc: brief,
                  builder: (context, b) => b.load == BriefLoad.ready
                      ? BriefBar(
                          state: b,
                          clock: clock.now,
                          onTouch: brief.touch,
                          onChoose: brief.choose,
                          onContinue: brief.continueStep,
                          onSkip: brief.skip,
                          onDate: brief.setDate,
                          onReopen: brief.reopen,
                          onTakeBack: brief.takeBack,
                          onSubmit: () => unawaited(brief.submit()),
                        )
                      : (b.load == BriefLoad.loading ||
                            b.load == BriefLoad.idle)
                      ? const SizedBox(height: 120)
                      // No builder or no options: the headline stays, the one action is WhatsApp
                      // (spec edge case). The failure is reported, never hidden by built-in options.
                      : TopHit(
                          label: l10n.mlMenuWhatsapp,
                          leading: ShootIcons.whatsapp,
                          chevron: true,
                          onPressed: onWhatsapp,
                        ),
                ),
              ),
              if (pauseNearHero)
                Align(
                  alignment: AlignmentDirectional.centerEnd,
                  child: Padding(
                    padding: const EdgeInsetsDirectional.only(end: 12, top: 8),
                    child: AmbientPauseButton(
                      pauseLabel: l10n.mlPauseMotion,
                      playLabel: l10n.mlPlayMotion,
                    ),
                  ),
                ),
              const SizedBox(height: 48),
            ],
          ),
        ),
      ],
    );
  }
}

class _SectionHead extends StatelessWidget {
  const _SectionHead({required this.title, this.trailing, this.sub});

  final String title;
  final String? sub;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsetsDirectional.fromSTEB(20, 0, 20, 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Semantics(
                  header: true,
                  child: Text(
                    title,
                    style: ShootType.display.copyWith(
                      fontSize: 28,
                      height: 1.15,
                      letterSpacing: -0.03 * 28,
                      color: c.ink,
                    ),
                  ),
                ),
                if (sub != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Text(
                      sub!,
                      style: ShootType.meta.copyWith(color: c.mute),
                    ),
                  ),
              ],
            ),
          ),
          ?trailing,
        ],
      ),
    );
  }
}

/// "What do you need shot?": a tile starts the brief with that occasion chosen.
class _Occasions extends StatelessWidget {
  const _Occasions({required this.section, required this.brief});

  final CategoriesGridSection section;
  final BriefCubit brief;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Padding(
      padding: const EdgeInsets.only(bottom: 64),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _SectionHead(title: section.heading, sub: section.subheading),
          SizedBox(
            height: 236,
            child: ListView.separated(
              key: const ValueKey('landing:occasions'),
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsetsDirectional.symmetric(horizontal: 12),
              itemCount: section.tiles.length,
              separatorBuilder: (_, _) => const SizedBox(width: 10),
              itemBuilder: (context, i) {
                final tile = section.tiles[i];
                return _OccasionTile(
                  index: i,
                  name: tile.category.name,
                  image: tile.category,
                  onTap: () => brief.startWithOption(tile.category.slug),
                );
              },
            ),
          ),
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: Padding(
              padding: const EdgeInsetsDirectional.only(start: 12, top: 8),
              child: TextButton(
                key: const ValueKey('landing:pickOwn'),
                onPressed: brief.openFirstUnanswered,
                style: TextButton.styleFrom(
                  minimumSize: const Size(44, 44),
                  foregroundColor: context.colors.accentInk,
                ),
                child: Text(l10n.mlOrPickYourOwn),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _OccasionTile extends StatelessWidget {
  const _OccasionTile({
    required this.index,
    required this.name,
    required this.image,
    required this.onTap,
  });

  final int index;
  final String name;
  final Category image;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: name,
      onTap: onTap,
      excludeSemantics: true,
      child: GestureDetector(
        onTap: onTap,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(ShootRadius.panel),
          child: SizedBox(
            width: 132,
            height: 236,
            child: Stack(
              fit: StackFit.expand,
              children: [
                image.image == null
                    ? SceneTile(
                        variant: SceneTile.variantFor(index + 1),
                        radius: 0,
                      )
                    : ShootImage(image.image, sceneIndex: index),
                Align(
                  alignment: AlignmentDirectional.bottomStart,
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.fromLTRB(12, 44, 12, 12),
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.bottomCenter,
                        end: Alignment.topCenter,
                        colors: [Color(0xDB1D120C), Color(0x001D120C)],
                      ),
                    ),
                    child: Text(
                      name,
                      style: ShootType.action.copyWith(
                        color: const Color(0xFFFFFFFF),
                        height: 1.2,
                      ),
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

/// "Meet the creators": a slowly moving strip of real creator cards, behind the page's one Pause.
class _Creators extends StatelessWidget {
  const _Creators({required this.section});

  final CreatorNetworkSection section;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Padding(
      padding: const EdgeInsets.only(bottom: 64),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _SectionHead(
            title: section.heading,
            sub: section.subheading,
            trailing: AmbientPauseButton(
              pauseLabel: l10n.mlPauseMotion,
              playLabel: l10n.mlPlayMotion,
            ),
          ),
          CreatorStrip(
            creators: section.creators,
            onOpen: (code) => unawaited(context.push('/creators/$code')),
          ),
          Align(
            alignment: AlignmentDirectional.centerEnd,
            child: Padding(
              padding: const EdgeInsetsDirectional.only(end: 12, top: 8),
              child: TextButton(
                key: const ValueKey('landing:seeAll'),
                onPressed: () => unawaited(context.push(AppRoutes.creators)),
                style: TextButton.styleFrom(
                  minimumSize: const Size(44, 44),
                  foregroundColor: context.colors.accentInk,
                ),
                child: Text(section.cta?.label ?? l10n.mlSeeAll),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// The strip. It drifts only while the page plays, motion is not reduced, nobody touches it and no
/// screen reader or switch control is on; otherwise it is a plain horizontal list with every card
/// reachable in order (spec FR-032, US4-S8).
class CreatorStrip extends StatefulWidget {
  const CreatorStrip({super.key, required this.creators, required this.onOpen});

  final List<CreatorCard> creators;
  final void Function(String code) onOpen;

  @override
  State<CreatorStrip> createState() => _CreatorStripState();
}

class _CreatorStripState extends State<CreatorStrip>
    with SingleTickerProviderStateMixin {
  static const _cardWidth = 196.0;
  static const _gap = 12.0;

  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: ShootAmbient.drift,
  );
  final _scroll = ScrollController();
  bool _touching = false;

  @override
  void initState() {
    super.initState();
    _c.addListener(() {
      if (_touching || !_scroll.hasClients) return;
      final loop = widget.creators.length * (_cardWidth + _gap);
      _scroll.jumpTo(_c.value * loop);
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final paused = AmbientPause.of(context).value;
    final reduced =
        MediaQuery.disableAnimationsOf(context) &&
        !AmbientPause.overridesReduced(context);
    final assistive = MediaQuery.accessibleNavigationOf(context);
    final run = !paused && !reduced && !assistive && !_touching;
    if (run && !_c.isAnimating) {
      _c.repeat();
    } else if (!run && _c.isAnimating) {
      _c.stop();
    }
  }

  @override
  void dispose() {
    _c.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _touch(bool down) {
    _touching = down;
    didChangeDependencies();
  }

  @override
  Widget build(BuildContext context) {
    final drifting = _c.isAnimating || _touching;
    return Listener(
      onPointerDown: (_) => _touch(true),
      onPointerUp: (_) => _touch(false),
      onPointerCancel: (_) => _touch(false),
      child: SizedBox(
        height: 232,
        child: ListView.builder(
          key: const ValueKey('landing:strip'),
          controller: _scroll,
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsetsDirectional.only(start: 12),
          // Endless while drifting so the loop is seamless; finite for people who scroll or listen.
          itemCount: drifting ? null : widget.creators.length,
          itemBuilder: (context, i) {
            final card = widget.creators[i % widget.creators.length];
            return Padding(
              padding: const EdgeInsetsDirectional.only(end: _gap),
              child: _CreatorCard(
                card: card,
                index: i % widget.creators.length,
                onTap: () => widget.onOpen(card.code),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _CreatorCard extends StatelessWidget {
  const _CreatorCard({
    required this.card,
    required this.index,
    required this.onTap,
  });

  final CreatorCard card;
  final int index;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final places = card.places.join(', ');
    final label = [
      card.name,
      card.types,
      places,
      card.displayCode,
    ].where((s) => s.isNotEmpty).join(', ');
    return Semantics(
      button: true,
      label: label,
      onTap: onTap,
      excludeSemantics: true,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          width: 196,
          padding: const EdgeInsets.fromLTRB(8, 8, 8, 12),
          decoration: BoxDecoration(
            color: c.panelSolid,
            border: Border.all(color: c.hair),
            borderRadius: BorderRadius.circular(ShootRadius.panel),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(ShootRadius.photoTile),
                child: SizedBox(
                  height: 124,
                  width: double.infinity,
                  // The creator's own cover photo, or an honest scene tile (spec FR-021).
                  child: ShootImage(card.photo, sceneIndex: index),
                ),
              ),
              const SizedBox(height: 8),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: Text(
                  card.name,
                  style: ShootType.action.copyWith(fontSize: 16, color: c.ink),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: Text(
                  [card.types, places].where((s) => s.isNotEmpty).join(' · '),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: ShootType.meta.copyWith(color: c.mute),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(4, 6, 4, 0),
                child: Text(
                  card.displayCode,
                  style: ShootType.meta.copyWith(color: c.mute),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// "Shoot for a living?": stays dark in both themes (spec FR-023).
class _Band extends StatelessWidget {
  const _Band({required this.section});

  final PersonaBandSection section;

  @override
  Widget build(BuildContext context) {
    const ink = Color(0xFFF5F5F7);
    return Container(
      key: const ValueKey('landing:band'),
      margin: const EdgeInsets.only(bottom: 64),
      padding: const EdgeInsetsDirectional.fromSTEB(20, 56, 20, 56),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF17171A), Color(0xFF2A211C), Color(0xFF3A2B25)],
          stops: [0, .7, 1],
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Semantics(
            header: true,
            child: Text(
              section.heading,
              style: ShootType.display.copyWith(
                fontSize: 28,
                height: 1.15,
                letterSpacing: -0.03 * 28,
                color: ink,
              ),
            ),
          ),
          if (section.body case final body?)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 290),
                child: Text(
                  body,
                  style: ShootType.body.copyWith(
                    fontSize: 16,
                    height: 1.5,
                    color: const Color(0xFFD6D2CD),
                  ),
                ),
              ),
            ),
          if (section.cta case final cta?)
            Padding(
              padding: const EdgeInsets.only(top: 22),
              child: Semantics(
                button: true,
                label: cta.label,
                onTap: () => unawaited(context.push(AppRoutes.register)),
                excludeSemantics: true,
                child: GestureDetector(
                  key: const ValueKey('landing:join'),
                  onTap: () => unawaited(context.push(AppRoutes.register)),
                  child: Container(
                    height: 50,
                    padding: const EdgeInsets.symmetric(horizontal: 18),
                    decoration: BoxDecoration(
                      border: Border.all(color: const Color(0x70FFFFFF)),
                      borderRadius: BorderRadius.circular(ShootRadius.row),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          cta.label,
                          style: ShootType.action.copyWith(color: ink),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// "Ready when you are": back up to the brief. Counts as the same one primary action as the hero's.
class _Closing extends StatelessWidget {
  const _Closing({required this.section, required this.brief});

  final CallToActionSection section;
  final BriefCubit brief;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsetsDirectional.symmetric(horizontal: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsetsDirectional.symmetric(horizontal: 8),
            child: Semantics(
              header: true,
              child: Text(
                section.heading,
                style: ShootType.display.copyWith(color: c.ink),
              ),
            ),
          ),
          if (section.body case final body?)
            Padding(
              padding: const EdgeInsetsDirectional.fromSTEB(8, 10, 8, 0),
              child: Text(
                body,
                style: ShootType.body.copyWith(color: c.bodyInk),
              ),
            ),
          const SizedBox(height: 14),
          TopHit(
            key: const ValueKey('landing:closingTopHit'),
            label: section.primary?.label ?? context.l10n.mlStartYourBrief,
            chevron: true,
            glint: false,
            onPressed: brief.openFirstUnanswered,
          ),
        ],
      ),
    );
  }
}
