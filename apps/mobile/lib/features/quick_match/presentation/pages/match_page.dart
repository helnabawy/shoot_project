import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/routing/app_router.dart';
import 'package:shoot_mobile/core/routing/error_page.dart';
import 'package:shoot_mobile/core/routing/not_found_page.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/web/website_links.dart';
import 'package:shoot_mobile/core/widgets/creator_card.dart';
import 'package:shoot_mobile/core/widgets/message_banner.dart';
import 'package:shoot_mobile/core/widgets/money.dart';
import 'package:shoot_mobile/core/widgets/secondary_button.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';
import 'package:shoot_mobile/core/widgets/shoot_image.dart';
import 'package:shoot_mobile/core/widgets/shoot_scaffold.dart';
import 'package:shoot_mobile/core/widgets/snap_carousel.dart';
import 'package:shoot_mobile/core/widgets/status_badge.dart';
import 'package:shoot_mobile/core/widgets/text_link.dart';
import 'package:shoot_mobile/core/widgets/top_hit.dart';
import 'package:shoot_mobile/features/quick_match/domain/entities/quick_match.dart';
import 'package:shoot_mobile/features/quick_match/presentation/cubit/book_flow_cubit.dart';
import 'package:shoot_mobile/features/quick_match/presentation/cubit/match_cubit.dart';
import 'package:shoot_mobile/features/quick_match/presentation/widgets/qm_parts.dart';

/// Screens 07 and 08, built to boards `S02-choose-creator` and `S02b-none-free`: the creators who
/// are free on the brief's day as a carousel, the one primary action following the chosen card;
/// when nobody is free, the nearest other days.
class MatchScreen extends StatefulWidget {
  const MatchScreen({
    super.key,
    required this.ref,
    required this.accessKey,
    this.openUrl = openInBrowser,
  });

  final String ref;
  final String accessKey;

  /// Opens WhatsApp (or the web chat); replaced in tests.
  final UrlOpener openUrl;

  @override
  State<MatchScreen> createState() => _MatchScreenState();
}

class _MatchScreenState extends State<MatchScreen> {
  late final MatchCubit _cubit;

  @override
  void initState() {
    super.initState();
    final cubit = _cubit = context.read<MatchCubit>();
    if (cubit.state.page == null) {
      unawaited(cubit.load().then((_) => cubit.startLive()));
    } else {
      cubit.startLive();
    }
  }

  @override
  void dispose() {
    // 022: the offers list stops re-checking once it is off screen.
    _cubit.stopLive();
    super.dispose();
  }

  void _continue(MatchState state) {
    final page = state.page!;
    final picks = state.picks;
    if (picks == null) return;
    context.read<BookFlowCubit>().begin(
      picks: picks,
      date: state.date ?? page.date ?? page.briefDate ?? '',
      duration: page.duration ?? '',
      startTime: page.briefStartTime,
    );
    unawaited(context.push('/match/${widget.ref}/${widget.accessKey}/details'));
  }

  void _chat(MatchPage page) {
    final url = page.whatsappUrl;
    if (url != null) unawaited(widget.openUrl(Uri.parse(url)));
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<MatchCubit, MatchState>(
      builder: (context, state) {
        switch (state.status) {
          case MatchStatus.loading:
            return const ShootScaffold(
              child: Center(child: CircularProgressIndicator()),
            );
          case MatchStatus.notFound:
            return const NotFoundPage();
          case MatchStatus.failed:
            return ErrorPage(
              onRetry: () => unawaited(context.read<MatchCubit>().load()),
            );
          case MatchStatus.ready:
            final page = state.page!;
            return ShootScaffold(
              child: Column(
                children: [
                  QmHeader(onBack: () => qmBack(context)),
                  Expanded(
                    child: page.offersMode
                        ? _Offers(
                            state: state,
                            onAccept: (s, i) {
                              final cubit = context.read<MatchCubit>()
                                ..choose(s, i);
                              final next = cubit.state;
                              if (_allChosen(next)) _continue(next);
                            },
                            onDecline: (s, i) => unawaited(
                              context.read<MatchCubit>().decline(s, i),
                            ),
                            onChat: () => _chat(page),
                            onProfile: (code) => context.push(
                              '/creators/${Uri.encodeComponent(code)}',
                            ),
                            onEdit: () => context.go(AppRoutes.home),
                          )
                        : page.noneFree
                        ? _NoneFree(
                            page: page,
                            onDay: (day) => unawaited(
                              context.read<MatchCubit>().changeDay(day),
                            ),
                            onChat: () => _chat(page),
                          )
                        : _Choose(
                            state: state,
                            onContinue: () => _continue(state),
                            onChat: () => _chat(page),
                            onProfile: (code) =>
                                context.push('/creators/$code'),
                            onLetUsPick: () {
                              context.read<MatchCubit>().letTeamPick();
                              _continue(context.read<MatchCubit>().state);
                            },
                            onEdit: () => context.go(AppRoutes.home),
                          ),
                  ),
                ],
              ),
            );
        }
      },
    );
  }
}

/// 022: every type has an explicitly chosen offer.
bool _allChosen(MatchState state) {
  final page = state.page;
  if (page == null) return false;
  return page.sections.every(
    (s) =>
        (s.offers?.isNotEmpty ?? false) &&
        state.chosen.containsKey(s.persona.slug),
  );
}

/// Boards 45–47 (feature 022): the offers for each type, lowest total first, each with Accept and
/// Decline visible (FR-016a); only the first offer's Accept is the primary action. Before any offer,
/// how many creators the brief went to.
class _Offers extends StatelessWidget {
  const _Offers({
    required this.state,
    required this.onAccept,
    required this.onDecline,
    required this.onChat,
    required this.onProfile,
    required this.onEdit,
  });

  final MatchState state;
  final void Function(int section, int index) onAccept;
  final void Function(int section, int index) onDecline;
  final VoidCallback onChat;

  /// 022 (FR-016d): opens an offering creator's profile over step 2, which keeps its state.
  final ValueChanged<String> onProfile;
  final VoidCallback onEdit;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    final page = state.page!;
    final count = page.sections.fold<int>(
      0,
      (n, s) => n + (s.offers?.length ?? 0),
    );
    return QmBody(
      content: [
        // 022 (board 48): an offer moved while the client was on the details step.
        if (state.moved case final name?)
          Padding(
            key: const ValueKey('qm:offerMoved'),
            padding: const EdgeInsetsDirectional.fromSTEB(20, 4, 20, 8),
            child: MessageBanner(
              text:
                  '${l10n.qmOffersChangedTitle(name)}. ${l10n.qmOffersChangedIntro}',
              tone: BannerTone.attention,
            ),
          ),
        Padding(
          padding: const EdgeInsetsDirectional.fromSTEB(20, 4, 20, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            spacing: 6,
            children: [
              QmStepLine(step: 2, summary: page.sentence, onEdit: onEdit),
              Text(
                page.closed
                    ? l10n.qmOffersClosedTitle
                    : count == 0
                    ? l10n.qmOffersWaiting
                    : l10n.qmOffersCount(count),
                style: ShootType.title.copyWith(color: c.ink, fontSize: 28),
              ),
              if (page.closed)
                Text(
                  l10n.qmOffersClosedIntro,
                  style: ShootType.body.copyWith(color: c.mute),
                )
              else if (count == 0)
                Text(
                  l10n.qmOffersSentTo(page.sentTo),
                  style: ShootType.body.copyWith(color: c.mute),
                ),
            ],
          ),
        ),
        for (var s = 0; s < page.sections.length; s++) ...[
          if (page.sections.length > 1 || page.sections[s].budgetFils != null)
            Padding(
              padding: const EdgeInsetsDirectional.fromSTEB(20, 16, 20, 6),
              child: Text(
                l10n.qmOffersGroup(
                  page.sections[s].persona.singular,
                  Money.format((page.sections[s].budgetFils ?? 0) / 100),
                ),
                style: ShootType.meta.copyWith(color: c.mute),
              ),
            ),
          if ((page.sections[s].offers ?? const []).isEmpty)
            Padding(
              padding: const EdgeInsetsDirectional.fromSTEB(20, 4, 20, 4),
              child: Text(
                l10n.qmOffersNone,
                style: ShootType.body.copyWith(color: c.mute),
              ),
            ),
          for (final (i, offer)
              in (page.sections[s].offers ?? const <MatchOffer>[]).indexed)
            _OfferCard(
              offer: offer,
              primary: s == 0 && i == 0,
              chosen: state.chosen[page.sections[s].persona.slug] == i,
              onAccept: () => onAccept(s, i),
              onDecline: () => onDecline(s, i),
              onProfile: () => onProfile(offer.creator.code),
            ),
        ],
      ],
      bottom: TextLink(label: l10n.qmAskWhatsApp, onTap: onChat),
    );
  }
}

class _OfferCard extends StatelessWidget {
  const _OfferCard({
    required this.offer,
    required this.primary,
    required this.chosen,
    required this.onAccept,
    required this.onDecline,
    required this.onProfile,
  });

  final MatchOffer offer;
  final bool primary;
  final bool chosen;
  final VoidCallback onAccept;
  final VoidCallback onDecline;
  final VoidCallback onProfile;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    final card = offer.creator.card;
    final accept = l10n.qmOfferAccept(offer.creator.firstName);
    return Padding(
      padding: const EdgeInsetsDirectional.fromSTEB(12, 6, 12, 6),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: c.panelSolid,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: c.hair),
        ),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 12,
            children: [
              Row(
                spacing: 10,
                children: [
                  // FR-016d: who is offering opens their profile; Accept and Decline stay the actions.
                  Expanded(
                    child: Semantics(
                      link: true,
                      label: l10n.qmOfferProfile(card.name),
                      onTap: onProfile,
                      excludeSemantics: true,
                      child: GestureDetector(
                        onTap: onProfile,
                        behavior: HitTestBehavior.opaque,
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(minHeight: 44),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                spacing: 4,
                                children: [
                                  Flexible(
                                    child: Text(
                                      card.name,
                                      style: ShootType.row.copyWith(
                                        fontWeight: FontWeight.w600,
                                        color: c.ink,
                                      ),
                                    ),
                                  ),
                                  ShootIcon(
                                    ShootIcons.chevron,
                                    size: 14,
                                    color: c.mute,
                                  ),
                                ],
                              ),
                              Text(
                                card.displayCode,
                                style: ShootType.meta.copyWith(color: c.mute),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                  StatusBadge(
                    label: chosen
                        ? l10n.qmOfferChosen
                        : offer.atYourPrice
                        ? l10n.qmOfferYourPrice
                        : l10n.qmOfferTheirPrice,
                    tone: offer.atYourPrice || chosen
                        ? BadgeTone.success
                        : BadgeTone.neutral,
                  ),
                ],
              ),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      l10n.qmOfferBreakdown(
                        Money.format(offer.amountFils / 100),
                        Money.format(offer.feeFils / 100),
                      ),
                      style: ShootType.meta.copyWith(color: c.mute),
                    ),
                  ),
                  Text(
                    Money.format(offer.totalFils / 100),
                    style: ShootType.heading.copyWith(color: c.ink),
                  ),
                ],
              ),
              Row(
                spacing: 8,
                children: [
                  Expanded(
                    flex: 8,
                    child: primary && !chosen
                        ? TopHit(label: accept, onPressed: onAccept)
                        : SecondaryButton(
                            label: chosen ? l10n.qmOfferChosen : accept,
                            onPressed: onAccept,
                          ),
                  ),
                  Expanded(
                    flex: 5,
                    child: SecondaryButton(
                      label: l10n.qmOfferDecline,
                      onPressed: onDecline,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Choose extends StatelessWidget {
  const _Choose({
    required this.state,
    required this.onContinue,
    required this.onChat,
    required this.onProfile,
    required this.onLetUsPick,
    required this.onEdit,
  });

  final MatchState state;
  final VoidCallback onContinue;
  final VoidCallback onChat;
  final ValueChanged<String> onProfile;
  final VoidCallback onLetUsPick;
  final VoidCallback onEdit;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    final page = state.page!;
    final sections = page.sections;
    final first = state.chosenIn(0);
    final total = page.totalFils;
    final price = total == null ? null : Money.format(total / 100);
    final onRequest = page.priceOnRequest;
    final label = onRequest
        ? l10n.qmContinueOnWhatsApp
        : sections.length == 1 && first != null
        ? l10n.qmContinueWith(first.firstName)
        : l10n.qmContinueLabel;
    return QmBody(
      content: [
        Padding(
          padding: const EdgeInsetsDirectional.fromSTEB(20, 4, 20, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            spacing: 6,
            children: [
              QmStepLine(step: 2, summary: page.sentence, onEdit: onEdit),
              Text(
                l10n.qmChooseTitle,
                style: ShootType.title.copyWith(color: c.ink, fontSize: 28),
              ),
            ],
          ),
        ),
        for (var s = 0; s < sections.length; s++)
          _SectionRail(state: state, index: s, showTitle: sections.length > 1),
      ],
      bottom: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 12,
        children: [
          TopHit(
            label: label,
            price: onRequest ? null : price,
            chevron: true,
            onPressed: onRequest ? onChat : onContinue,
          ),
          if (!onRequest && sections.length == 1 && first != null)
            Center(
              child: TextLink(
                label: l10n.qmSeeWork(first.firstName),
                onTap: () => onProfile(first.code),
              ),
            ),
          if (!onRequest) _LetUsPickRow(onTap: onLetUsPick),
        ],
      ),
    );
  }
}

class _SectionRail extends StatelessWidget {
  const _SectionRail({
    required this.state,
    required this.index,
    required this.showTitle,
  });

  final MatchState state;
  final int index;
  final bool showTitle;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final section = state.page!.sections[index];
    final cubit = context.read<MatchCubit>();
    final chosen = state.chosenIn(index);
    final scale = MediaQuery.textScalerOf(context).scale(1).clamp(1.0, 2.0);
    return Padding(
      padding: const EdgeInsetsDirectional.only(top: 12),
      child: Semantics(
        container: true,
        label: l10n.qmCarouselLabel,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (showTitle)
              Padding(
                padding: const EdgeInsetsDirectional.fromSTEB(20, 0, 20, 8),
                child: Text(
                  section.persona.plural,
                  style: ShootType.heading.copyWith(color: context.colors.ink),
                ),
              ),
            SnapCarousel(
              height: 366 * scale,
              positionLabel: l10n.qmPosition,
              onChanged: (i) => cubit.choose(index, i),
              children: [
                for (final (i, creator) in section.creators.indexed)
                  _CreatorCardView(
                    creator: creator,
                    section: section,
                    chosen: chosen == null
                        ? false
                        : identical(chosen, creator) || chosen == creator,
                    scene: i,
                    onTap: () => cubit.choose(index, i),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _CreatorCardView extends StatelessWidget {
  const _CreatorCardView({
    required this.creator,
    required this.section,
    required this.chosen,
    required this.scene,
    required this.onTap,
  });

  final MatchCreator creator;
  final MatchSection section;
  final bool chosen;
  final int scene;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    final card = creator.card;
    final price = section.priceFils;
    final facts = card.specialties.take(2).join(' · ');
    final place = [...card.places].join(', ');
    final years = card.yearsExperience;
    final where = [place, ?(years == null ? null : '$years')].join(' · ');
    final meta = ShootType.meta.copyWith(color: c.mute);
    Widget tile(int i, double size) {
      final thumb = i < creator.gallery.length ? creator.gallery[i] : null;
      return ClipRRect(
        borderRadius: BorderRadius.circular(ShootRadius.photoTile),
        child: Stack(
          fit: StackFit.expand,
          children: [
            ShootImage(thumb?.thumb, sceneIndex: scene + i),
            if (thumb != null && thumb.isVideo)
              Center(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: c.photoScrim,
                    shape: BoxShape.circle,
                  ),
                  child: const SizedBox.square(
                    dimension: 32,
                    child: Icon(
                      Icons.play_arrow,
                      size: 16,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
          ],
        ),
      );
    }

    return CreatorCard(
      label: [
        card.name,
        if (creator.saidYes) l10n.quickMatchSaidYes,
        card.displayCode,
        facts,
        if (price != null) Money.format(price / 100),
      ].join(', '),
      chosen: chosen,
      onTap: onTap,
      children: [
        SizedBox(
          height: 176,
          child: Row(
            spacing: 6,
            children: [
              Expanded(
                flex: 2,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    tile(0, 176),
                    if (creator.saidYes)
                      PositionedDirectional(
                        top: 8,
                        start: 8,
                        child: StatusBadge(
                          label: l10n.quickMatchSaidYes,
                          tone: BadgeTone.success,
                        ),
                      ),
                  ],
                ),
              ),
              Expanded(
                child: Column(
                  spacing: 6,
                  children: [
                    Expanded(child: tile(1, 85)),
                    Expanded(child: tile(2, 85)),
                  ],
                ),
              ),
            ],
          ),
        ),
        Row(
          spacing: 10,
          children: [
            SizedBox.square(
              dimension: 40,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(ShootRadius.photoTile),
                child: ShootImage(card.photo, sceneIndex: scene),
              ),
            ),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    card.name,
                    style: ShootType.action.copyWith(
                      color: c.ink,
                      fontWeight: FontWeight.w600,
                      height: 1.3,
                    ),
                  ),
                  Text('\u2066${card.displayCode}\u2069 · $where', style: meta),
                ],
              ),
            ),
          ],
        ),
        Text(
          facts,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: ShootType.row.copyWith(
            fontSize: 14,
            color: c.ink,
            height: 1.4,
          ),
        ),
        DecoratedBox(
          decoration: BoxDecoration(
            border: Border(top: BorderSide(color: c.hair)),
          ),
          child: Padding(
            padding: const EdgeInsetsDirectional.only(top: 8),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                if (price == null)
                  Text(
                    l10n.qmPriceOnRequest,
                    style: ShootType.heading.copyWith(color: c.ink),
                  )
                else
                  Money(
                    amount: price / 100,
                    style: ShootType.heading.copyWith(
                      color: c.ink,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                const Spacer(),
                Flexible(
                  child: Text(
                    section.includes.take(1).join(' · '),
                    textAlign: TextAlign.end,
                    style: meta,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _LetUsPickRow extends StatelessWidget {
  const _LetUsPickRow({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    return Semantics(
      button: true,
      label: l10n.qmNotSure,
      onTap: onTap,
      excludeSemantics: true,
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: Container(
          constraints: const BoxConstraints(minHeight: 44),
          margin: const EdgeInsetsDirectional.symmetric(horizontal: 8),
          decoration: BoxDecoration(
            border: Border.symmetric(horizontal: BorderSide(color: c.hair)),
          ),
          child: Row(
            spacing: 12,
            children: [
              Container(
                width: 30,
                height: 30,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: c.tile,
                  borderRadius: BorderRadius.circular(ShootRadius.tile),
                ),
                child: ShootIcon(ShootIcons.search, size: 16, color: c.tileInk),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l10n.qmNotSure,
                      style: ShootType.body.copyWith(color: c.ink, height: 1.3),
                    ),
                  ],
                ),
              ),
              ShootIcon(ShootIcons.chevron, size: 16, color: c.mute),
            ],
          ),
        ),
      ),
    );
  }
}

/// Screen 08: nobody is free that day.
class _NoneFree extends StatelessWidget {
  const _NoneFree({
    required this.page,
    required this.onDay,
    required this.onChat,
  });

  final MatchPage page;
  final ValueChanged<String> onDay;
  final VoidCallback onChat;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    final days = page.nearby;
    return QmBody(
      content: [
        Padding(
          padding: const EdgeInsetsDirectional.fromSTEB(20, 4, 20, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            spacing: 6,
            children: [
              QmStepLine(step: 2, summary: page.sentence),
              Text(
                l10n.qmNoneTitle,
                style: ShootType.title.copyWith(color: c.ink, fontSize: 28),
              ),
              Text(
                l10n.qmNoneBody,
                style: ShootType.body.copyWith(color: c.bodyInk, height: 1.5),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsetsDirectional.fromSTEB(12, 16, 12, 0),
          child: Column(
            children: [
              for (final day in days)
                _DayRow(
                  label: qmDay(context, day.date),
                  free: l10n.qmDayFree(day.free),
                  onTap: () => onDay(day.date),
                ),
            ],
          ),
        ),
      ],
      bottom: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 12,
        children: [
          if (days.isNotEmpty)
            TopHit(
              label: l10n.qmContinueOn(qmDay(context, days.first.date)),
              chevron: true,
              onPressed: () => onDay(days.first.date),
            ),
          Center(
            child: TextLink(
              label: l10n.qmAskWhatsApp,
              onTap: page.whatsappUrl == null ? null : onChat,
            ),
          ),
        ],
      ),
    );
  }
}

class _DayRow extends StatelessWidget {
  const _DayRow({required this.label, required this.free, required this.onTap});

  final String label;
  final String free;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      button: true,
      label: '$label, $free',
      onTap: onTap,
      excludeSemantics: true,
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: Container(
          constraints: const BoxConstraints(minHeight: 48),
          decoration: BoxDecoration(
            border: Border(bottom: BorderSide(color: c.hair)),
          ),
          child: Row(
            children: [
              Expanded(
                child: Text(label, style: ShootType.row.copyWith(color: c.ink)),
              ),
              Text(free, style: ShootType.meta.copyWith(color: c.mute)),
              const SizedBox(width: 8),
              ShootIcon(ShootIcons.chevron, size: 16, color: c.mute),
            ],
          ),
        ),
      ),
    );
  }
}
