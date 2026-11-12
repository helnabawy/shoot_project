import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/l10n/bidi.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/routing/app_routes.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/web/share_link.dart';
import 'package:shoot_mobile/core/web/website_links.dart';
import 'package:shoot_mobile/core/widgets/css_line_box.dart';
import 'package:shoot_mobile/core/widgets/group_label.dart';
import 'package:shoot_mobile/core/widgets/scene_tile.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';
import 'package:shoot_mobile/core/widgets/shoot_image.dart';
import 'package:shoot_mobile/core/widgets/shoot_panel.dart';
import 'package:shoot_mobile/core/widgets/shoot_row.dart';
import 'package:shoot_mobile/core/widgets/shoot_scaffold.dart';
import 'package:shoot_mobile/core/widgets/top_hit.dart';
import 'package:shoot_mobile/features/creators/domain/entities/creators.dart';
import 'package:shoot_mobile/features/creators/domain/whatsapp_link.dart';
import 'package:shoot_mobile/features/creators/presentation/cubit/load_state.dart';
import 'package:shoot_mobile/features/creators/presentation/cubit/profile_cubit.dart';
import 'package:shoot_mobile/features/creators/presentation/pages/sample_viewer.dart';
import 'package:shoot_mobile/features/creators/presentation/widgets/creator_parts.dart';
import 'package:shoot_mobile/features/creators/presentation/widgets/glyph.dart';

/// Screen 16, built to board `S06-profile`: who the creator is, the one primary action "Book with
/// {first name}", the actions, about, the bio and the work. Opened at `/creators/{code}`.
///
/// Opening links, WhatsApp and the share sheet go through [open] and [share] so tests can watch
/// them; both default to the system.
class ProfilePage extends StatelessWidget {
  const ProfilePage({
    super.key,
    required this.links,
    required this.open,
    required this.share,
  });

  final WebsiteLinks links;
  final UrlOpener open;
  final ShareLink share;

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<ProfileCubit, LoadState<ProfileData>>(
      builder: (context, state) => LoadView<ProfileData>(
        state: state,
        onRetry: () => unawaited(context.read<ProfileCubit>().load()),
        builder: (context, data) => ProfileView(
          data: data,
          onBack: () =>
              context.canPop() ? context.pop() : context.go(AppRoutes.creators),
          onBook: () =>
              context.push('/book/${Uri.encodeComponent(data.profile.code)}'),
          onShare: () => unawaited(
            share(
              links.address(
                '/creators/${Uri.encodeComponent(data.profile.displayCode)}',
                languageCode: Localizations.localeOf(context).languageCode,
              ),
            ),
          ),
          onWhatsapp: () {
            final number = data.whatsappNumber;
            if (number == null) return;
            final link = whatsappLink(
              number,
              context.l10n.mcAskMessage(
                data.profile.name,
                data.profile.displayCode,
              ),
            );
            if (link != null) unawaited(open(link));
          },
          onLink: (url) {
            final uri = Uri.tryParse(url);
            if (uri != null) unawaited(open(uri));
          },
          onSample: (samples, index) => unawaited(
            Navigator.of(context).push<void>(
              MaterialPageRoute(
                fullscreenDialog: true,
                builder: (_) => SampleViewer(
                  samples: samples,
                  initial: index,
                  onPlay: (url) => unawaited(open(url)),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// The screen for loaded [ProfileData]; widget tests and goldens render it directly.
class ProfileView extends StatefulWidget {
  const ProfileView({
    super.key,
    required this.data,
    required this.onBack,
    required this.onBook,
    required this.onShare,
    required this.onWhatsapp,
    required this.onLink,
    required this.onSample,
  });

  final ProfileData data;
  final VoidCallback onBack;
  final VoidCallback onBook;
  final VoidCallback onShare;
  final VoidCallback onWhatsapp;
  final void Function(String url) onLink;
  final void Function(List<Sample> samples, int index) onSample;

  @override
  State<ProfileView> createState() => _ProfileViewState();
}

class _ProfileViewState extends State<ProfileView> {
  final _work = GlobalKey();

  void _seeWork() {
    final target = _work.currentContext;
    if (target != null) {
      unawaited(
        Scrollable.ensureVisible(
          target,
          duration: MediaQuery.disableAnimationsOf(context)
              ? Duration.zero
              : ShootMotion.slow,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    final profile = widget.data.profile;
    final samples = profile.samples;
    final firstName = profile.name.trim().split(RegExp(r'\s+')).first;
    final canWhatsapp = widget.data.whatsappNumber != null;
    final bioDirection = firstStrongDirection(profile.bio);
    return ShootScaffold(
      child: Column(
        children: [
          FlowHeader(
            backLabel: l10n.mcBackToCreators,
            onBack: widget.onBack,
            end: Semantics(
              button: true,
              label: l10n.mcShareProfile,
              excludeSemantics: true,
              onTap: widget.onShare,
              child: GestureDetector(
                onTap: widget.onShare,
                behavior: HitTestBehavior.opaque,
                child: SizedBox.square(
                  dimension: ShootSize.iconButton,
                  child: Center(
                    child: Glyph(
                      Glyphs.share,
                      color: c.ink,
                      size: 20,
                      strokeWidth: 2,
                    ),
                  ),
                ),
              ),
            ),
          ),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsetsDirectional.fromSTEB(12, 8, 12, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                spacing: 24,
                children: [
                  FloatingPanel(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Padding(
                          padding: const EdgeInsetsDirectional.fromSTEB(
                            16,
                            14,
                            16,
                            10,
                          ),
                          child: Row(
                            spacing: 14,
                            children: [
                              CreatorAvatar(
                                photo: profile.photo,
                                size: 64,
                                radius: ShootRadius.photoLarge,
                                label: profile.photo == null
                                    ? l10n.mcNoPhoto
                                    : profile.name,
                              ),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  spacing: 2,
                                  children: [
                                    Semantics(
                                      header: true,
                                      child: CssLineBox(
                                        key: const ValueKey('fidelity:h1'),
                                        fontSize: 26,
                                        height: 1.2,
                                        child: Text(
                                          profile.name,
                                          style: ShootType.title.copyWith(
                                            height: 1.2,
                                            color: c.ink,
                                          ),
                                        ),
                                      ),
                                    ),
                                    Text(
                                      isolate(context, profile.displayCode),
                                      style: ShootType.meta.copyWith(
                                        color: c.mute,
                                        fontFeatures: const [
                                          FontFeature.tabularFigures(),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        _Divider(color: c.hair),
                        Padding(
                          padding: const EdgeInsetsDirectional.symmetric(
                            horizontal: 8,
                          ),
                          child: Column(
                            children: [
                              if (profile.types.isNotEmpty)
                                FactRow(
                                  glyph: Glyphs.tag,
                                  value: profile.types,
                                  label: l10n.mcProfessional,
                                ),
                              if (profile.specialties.isNotEmpty)
                                FactRow(
                                  glyph: Glyphs.tag,
                                  value: profile.specialties.join(' · '),
                                  label: l10n.mcShoots,
                                ),
                              if (profile.places.isNotEmpty)
                                FactRow(
                                  glyph: Glyphs.pin,
                                  value: profile.places.join(' · '),
                                  label: l10n.mcWorksIn,
                                ),
                            ],
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsetsDirectional.fromSTEB(
                            8,
                            4,
                            8,
                            8,
                          ),
                          child: TopHit(
                            label: l10n.mcBookWith(firstName),
                            chevron: true,
                            onPressed: profile.canBook ? widget.onBook : null,
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsetsDirectional.fromSTEB(
                            8,
                            0,
                            8,
                            4,
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              GroupLabel(
                                l10n.mcActions,
                                padding: const EdgeInsetsDirectional.fromSTEB(
                                  8,
                                  6,
                                  8,
                                  4,
                                ),
                              ),
                              if (samples.isNotEmpty)
                                _ActionRow(
                                  glyph: Glyphs.image,
                                  label: l10n.mcSeeTheWork,
                                  meta: l10n.mcPieces(samples.length),
                                  onTap: _seeWork,
                                ),
                              if (canWhatsapp)
                                _ActionRow(
                                  glyph: null,
                                  label: l10n.mcAskWhatsapp,
                                  onTap: widget.onWhatsapp,
                                ),
                              for (final link in profile.social)
                                _ActionRow(
                                  glyph:
                                      link.label.toLowerCase().contains(
                                        'instagram',
                                      )
                                      ? Glyphs.instagram
                                      : Glyphs.globe,
                                  label: link.label,
                                  external: true,
                                  onTap: () => widget.onLink(link.url),
                                ),
                            ],
                          ),
                        ),
                        if (profile.languages.isNotEmpty ||
                            profile.yearsExperience != null ||
                            profile.nationality != null) ...[
                          _Divider(color: c.hair),
                          Padding(
                            padding: const EdgeInsetsDirectional.fromSTEB(
                              8,
                              0,
                              8,
                              8,
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                GroupLabel(
                                  l10n.mcAbout,
                                  padding: const EdgeInsetsDirectional.fromSTEB(
                                    8,
                                    10,
                                    8,
                                    4,
                                  ),
                                ),
                                if (profile.languages.isNotEmpty)
                                  FactRow(
                                    glyph: Glyphs.globe,
                                    value: profile.languages.join(' · '),
                                    label: l10n.mcSpeaksLabel,
                                  ),
                                if (profile.yearsExperience case final years?)
                                  FactRow(
                                    glyph: Glyphs.clock,
                                    value: l10n.mcYears(years),
                                    label: l10n.mcExperience,
                                  ),
                                if (profile.nationality case final nation?)
                                  FactRow(
                                    glyph: Glyphs.pinLarge,
                                    value: nation,
                                    label: l10n.mcFrom,
                                  ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  if (profile.bio.isNotEmpty)
                    Padding(
                      padding: const EdgeInsetsDirectional.symmetric(
                        horizontal: 4,
                      ),
                      child: Directionality(
                        textDirection:
                            bioDirection ?? Directionality.of(context),
                        child: Text(
                          profile.bio,
                          textAlign: TextAlign.start,
                          style: ShootType.body.copyWith(
                            color: c.ink,
                            height: 1.65,
                          ),
                        ),
                      ),
                    ),
                  KeyedSubtree(
                    key: _work,
                    child: _WorkSection(
                      samples: samples,
                      onSample: (i) => widget.onSample(samples, i),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Divider extends StatelessWidget {
  const _Divider({required this.color});

  final Color color;

  @override
  Widget build(BuildContext context) => Container(height: 1, color: color);
}

class _ActionRow extends StatelessWidget {
  const _ActionRow({
    required this.glyph,
    required this.label,
    required this.onTap,
    this.meta,
    this.external = false,
  });

  /// `null` draws the WhatsApp icon of the shared set.
  final Glyphs? glyph;
  final String label;
  final String? meta;
  final bool external;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return ShootRow(
      label: label,
      onTap: onTap,
      chevron: false,
      minHeight: 44,
      padding: const EdgeInsetsDirectional.symmetric(
        vertical: 7,
        horizontal: 8,
      ),
      leading: Tile30(
        child: glyph == null
            ? ShootIcon(ShootIcons.whatsapp, color: c.tileInk)
            : Glyph(glyph!, color: c.tileInk),
      ),
      trailing: external
          ? Glyph(Glyphs.external, color: c.mute, size: 14)
          : meta == null
          ? null
          : Text(meta!, style: ShootType.meta.copyWith(color: c.mute)),
    );
  }
}

/// "Work": a two-column grid of the creator's samples in their order, or "awaiting samples".
class _WorkSection extends StatelessWidget {
  const _WorkSection({required this.samples, required this.onSample});

  final List<Sample> samples;
  final void Function(int index) onSample;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 12,
      children: [
        Padding(
          padding: const EdgeInsetsDirectional.symmetric(horizontal: 4),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Semantics(
                header: true,
                child: Text(
                  l10n.mcWork,
                  style: ShootType.title.copyWith(color: c.ink),
                ),
              ),
              if (samples.isNotEmpty)
                Text(
                  l10n.mcPieces(samples.length),
                  style: ShootType.meta.copyWith(color: c.mute),
                ),
            ],
          ),
        ),
        if (samples.isEmpty)
          Padding(
            padding: const EdgeInsetsDirectional.symmetric(horizontal: 4),
            child: Text(
              l10n.mcAwaitingSamples,
              style: ShootType.body.copyWith(color: c.mute),
            ),
          )
        else
          GridView.count(
            crossAxisCount: 2,
            mainAxisSpacing: 8,
            crossAxisSpacing: 8,
            childAspectRatio: 4 / 5,
            shrinkWrap: true,
            padding: EdgeInsets.zero,
            physics: const NeverScrollableScrollPhysics(),
            children: [
              for (var i = 0; i < samples.length; i++)
                _SampleTile(
                  sample: samples[i],
                  index: i,
                  total: samples.length,
                  onTap: () => onSample(i),
                ),
            ],
          ),
      ],
    );
  }
}

class _SampleTile extends StatelessWidget {
  const _SampleTile({
    required this.sample,
    required this.index,
    required this.total,
    required this.onTap,
  });

  final Sample sample;
  final int index;
  final int total;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final video = sample.kind == SampleKind.video;
    final label = video
        ? l10n.mcSampleVideoLabel(index + 1, total)
        : l10n.mcSampleLabel(index + 1, total);
    return Semantics(
      button: true,
      label: [label, sample.alt].where((s) => s.isNotEmpty).join('. '),
      onTap: onTap,
      excludeSemantics: true,
      child: GestureDetector(
        onTap: onTap,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(ShootRadius.photoLarge),
          child: Stack(
            fit: StackFit.expand,
            alignment: Alignment.center,
            children: [
              ShootImage(sample.thumb, sceneIndex: SceneTile.variantFor(index)),
              if (video) const Center(child: PlayMark()),
            ],
          ),
        ),
      ),
    );
  }
}
