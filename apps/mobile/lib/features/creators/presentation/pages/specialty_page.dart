import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/routing/app_routes.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/widgets/choice_chip.dart';
import 'package:shoot_mobile/core/widgets/css_line_box.dart';
import 'package:shoot_mobile/core/widgets/group_label.dart';
import 'package:shoot_mobile/core/widgets/scene_tile.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';
import 'package:shoot_mobile/core/widgets/shoot_image.dart';
import 'package:shoot_mobile/core/widgets/shoot_scaffold.dart';
import 'package:shoot_mobile/core/widgets/text_link.dart';
import 'package:shoot_mobile/core/widgets/top_hit.dart';
import 'package:shoot_mobile/features/creators/domain/entities/creators.dart';
import 'package:shoot_mobile/features/creators/presentation/cubit/load_state.dart';
import 'package:shoot_mobile/features/creators/presentation/cubit/specialty_cubit.dart';
import 'package:shoot_mobile/features/creators/presentation/pages/sample_viewer.dart';
import 'package:shoot_mobile/features/creators/presentation/widgets/creator_parts.dart';
import 'package:shoot_mobile/features/creators/presentation/widgets/more_chip.dart';

/// Screen 18, built to board `S05b-specialty`: `/work/{specialty}`. Title and line come from the
/// CMS; counts show only when they are not zero; the first creator is the "Top hit" (a result, not
/// a recommendation); "See all n" opens the directory for the specialty; the one primary action
/// starts a brief for it.
class SpecialtyRoutePage extends StatelessWidget {
  const SpecialtyRoutePage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<SpecialtyCubit, LoadState<SpecialtyView>>(
      builder: (context, state) {
        final cubit = context.read<SpecialtyCubit>();
        return LoadView<SpecialtyView>(
          state: state,
          onRetry: () => unawaited(cubit.load()),
          builder: (context, view) => SpecialtyScreen(
            view: view,
            onPlace: cubit.selectPlace,
            onCreator: (code) => unawaited(
              context.push('/creators/${Uri.encodeComponent(code)}'),
            ),
            onSeeAll: () => context.go(
              Uri(
                path: AppRoutes.creators,
                queryParameters: {'specialty': view.page.slug},
              ).toString(),
            ),
            onBrief: () => context.go(
              Uri(
                path: AppRoutes.home,
                queryParameters: {'specialty': view.page.slug},
              ).toString(),
            ),
            onBack: () => context.go(AppRoutes.creators),
          ),
        );
      },
    );
  }
}

/// The screen for a loaded [SpecialtyView].
class SpecialtyScreen extends StatefulWidget {
  const SpecialtyScreen({
    super.key,
    required this.view,
    required this.onPlace,
    required this.onCreator,
    required this.onSeeAll,
    required this.onBrief,
    required this.onBack,
  });

  final SpecialtyView view;
  final void Function(String place) onPlace;
  final void Function(String code) onCreator;
  final VoidCallback onSeeAll;
  final VoidCallback onBrief;
  final VoidCallback onBack;

  @override
  State<SpecialtyScreen> createState() => _SpecialtyScreenState();
}

class _SpecialtyScreenState extends State<SpecialtyScreen> {
  bool _morePlaces = false;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    final view = widget.view;
    final page = view.page;
    final title = page.title.isNotEmpty
        ? page.title
        : l10n.mcSpecialtyTitle(page.name);
    final counts = [
      if (view.sampleCount > 0) l10n.mcSamplesCount(view.sampleCount),
      if (view.professionalCount > 0) l10n.mcProsCount(view.professionalCount),
    ];
    final places = view.places;
    final shownPlaces = _morePlaces || places.length <= 3
        ? places
        : [
            ...places.take(3),
            if (view.place != null && !places.take(3).contains(view.place))
              view.place!,
          ];
    final creators = view.creators;
    final others = view.others;
    final meta = ShootType.meta.copyWith(color: c.mute);
    return ShootScaffold(
      child: Column(
        children: [
          const BrowseHeader(),
          Expanded(
            child: CustomScrollView(
              slivers: [
                SliverFillRemaining(
                  hasScrollBody: false,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Padding(
                        padding: const EdgeInsetsDirectional.fromSTEB(
                          20,
                          8,
                          20,
                          0,
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          spacing: 8,
                          children: [
                            Align(
                              alignment: AlignmentDirectional.centerStart,
                              child: _BackLink(
                                label: l10n.mcDirectoryTitle,
                                onTap: widget.onBack,
                              ),
                            ),
                            Semantics(
                              header: true,
                              child: CssLineBox(
                                key: const ValueKey('fidelity:h1'),
                                fontSize: 34,
                                height: 1.2,
                                child: Text(
                                  title,
                                  style: ShootType.display.copyWith(
                                    height: 1.2,
                                    color: c.ink,
                                  ),
                                ),
                              ),
                            ),
                            if (page.description.isNotEmpty)
                              CssLineBox(
                                fontSize: 15,
                                height: 1.6,
                                child: Text(
                                  page.description,
                                  style: ShootType.body.copyWith(
                                    color: c.bodyInk,
                                  ),
                                ),
                              ),
                            if (counts.isNotEmpty)
                              CssLineBox(
                                fontSize: 13,
                                height: 1.4,
                                child: Text(counts.join(' · '), style: meta),
                              ),
                          ],
                        ),
                      ),
                      if (places.length > 1)
                        Padding(
                          padding: const EdgeInsetsDirectional.fromSTEB(
                            20,
                            16,
                            20,
                            0,
                          ),
                          child: Semantics(
                            container: true,
                            label: l10n.mcEmirateGroup,
                            child: ChipGroup(
                              children: [
                                for (final p in shownPlaces)
                                  ShootChip(
                                    label: p,
                                    on: view.place == p,
                                    onTap: () => widget.onPlace(p),
                                  ),
                                if (places.length > 3)
                                  MoreChip(
                                    label: _morePlaces
                                        ? l10n.mcLess
                                        : l10n.mcMore,
                                    onTap: () => setState(
                                      () => _morePlaces = !_morePlaces,
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        ),
                      if (view.topHit case final top?)
                        Padding(
                          padding: const EdgeInsetsDirectional.fromSTEB(
                            20,
                            22,
                            20,
                            0,
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              GroupLabel(
                                l10n.mcTopHit,
                                padding: const EdgeInsetsDirectional.only(
                                  bottom: 6,
                                ),
                              ),
                              CreatorRow(
                                creator: top,
                                top: true,
                                onTap: () => widget.onCreator(top.code),
                              ),
                            ],
                          ),
                        ),
                      if (others.isNotEmpty)
                        Padding(
                          padding: const EdgeInsetsDirectional.fromSTEB(
                            20,
                            18,
                            20,
                            0,
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              GroupLabel(
                                l10n.mcEveryoneElse,
                                padding: const EdgeInsetsDirectional.only(
                                  bottom: 6,
                                ),
                              ),
                              for (var i = 0; i < others.length; i++)
                                CreatorRow(
                                  creator: others[i],
                                  sceneIndex: i + 1,
                                  onTap: () => widget.onCreator(others[i].code),
                                ),
                              DecoratedBox(
                                decoration: BoxDecoration(
                                  border: Border(
                                    top: BorderSide(color: c.hair),
                                  ),
                                ),
                                child: const SizedBox(width: double.infinity),
                              ),
                              if (view.professionalCount > 1)
                                Align(
                                  alignment: AlignmentDirectional.centerStart,
                                  child: TextLink(
                                    label: l10n.mcSeeAll(
                                      view.professionalCount,
                                    ),
                                    onTap: widget.onSeeAll,
                                    style: ShootType.body,
                                  ),
                                ),
                            ],
                          ),
                        ),
                      if (view.samples.isNotEmpty)
                        Padding(
                          padding: const EdgeInsetsDirectional.fromSTEB(
                            20,
                            14,
                            20,
                            0,
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              GroupLabel(
                                l10n.mcRecentWork,
                                padding: const EdgeInsetsDirectional.only(
                                  bottom: 10,
                                ),
                              ),
                              Wrap(
                                spacing: 10,
                                runSpacing: 14,
                                children: [
                                  for (var i = 0; i < view.samples.length; i++)
                                    _RecentSample(
                                      sample: view.samples[i],
                                      index: i,
                                      onTap: () => widget.onCreator(
                                        view.samples[i].creatorCode,
                                      ),
                                    ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      if (creators.isEmpty && view.samples.isEmpty)
                        const SizedBox(height: 8),
                      const Spacer(),
                      Padding(
                        padding: const EdgeInsetsDirectional.fromSTEB(
                          12,
                          16,
                          12,
                          18,
                        ),
                        child: TopHit(
                          label: l10n.mcStartBrief(page.name),
                          chevron: true,
                          onPressed: widget.onBrief,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _BackLink extends StatelessWidget {
  const _BackLink({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      link: true,
      label: label,
      onTap: onTap,
      excludeSemantics: true,
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 44),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            spacing: 4,
            children: [
              ShootIcon(ShootIcons.back, size: 14, color: c.accentInk),
              Text(
                label,
                style: ShootType.body.copyWith(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: c.accentInk,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RecentSample extends StatelessWidget {
  const _RecentSample({
    required this.sample,
    required this.index,
    required this.onTap,
  });

  final SpecialtySample sample;
  final int index;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final l10n = context.l10n;
    final width =
        (MediaQuery.sizeOf(context).width.clamp(0, ShootSize.maxColumn) -
            40 -
            10) /
        2;
    return SizedBox(
      width: width,
      child: Semantics(
        link: true,
        label: l10n.mcSampleBy(sample.caption, sample.creatorName),
        onTap: onTap,
        excludeSemantics: true,
        child: GestureDetector(
          onTap: onTap,
          behavior: HitTestBehavior.opaque,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 6,
            children: [
              AspectRatio(
                aspectRatio: 4 / 3,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(ShootRadius.photoLarge),
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      ShootImage(
                        sample.thumb,
                        sceneIndex: SceneTile.variantFor(index),
                      ),
                      if (sample.kind == SampleKind.video)
                        const Center(child: PlayMark()),
                    ],
                  ),
                ),
              ),
              Text.rich(
                TextSpan(
                  style: ShootType.body.copyWith(
                    fontSize: 14,
                    height: 1.3,
                    color: c.ink,
                  ),
                  children: [
                    TextSpan(text: sample.caption),
                    TextSpan(
                      text: l10n.mcByCreator(sample.creatorName),
                      style: ShootType.meta.copyWith(color: c.mute),
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
