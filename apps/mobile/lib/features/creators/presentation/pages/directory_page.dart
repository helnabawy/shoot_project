import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/content/creator_card.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/routing/app_routes.dart';
import 'package:shoot_mobile/core/routing/error_page.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/widgets/choice_chip.dart';
import 'package:shoot_mobile/core/widgets/css_line_box.dart';
import 'package:shoot_mobile/core/widgets/empty_state.dart';
import 'package:shoot_mobile/core/widgets/icon_tile.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';
import 'package:shoot_mobile/core/widgets/shoot_scaffold.dart';
import 'package:shoot_mobile/core/widgets/text_link.dart';
import 'package:shoot_mobile/core/widgets/top_hit.dart';
import 'package:shoot_mobile/features/creators/domain/entities/creators.dart';
import 'package:shoot_mobile/features/creators/presentation/cubit/directory_cubit.dart';
import 'package:shoot_mobile/features/creators/presentation/widgets/creator_directory_card.dart';
import 'package:shoot_mobile/features/creators/presentation/widgets/creator_parts.dart';
import 'package:shoot_mobile/features/creators/presentation/widgets/more_chip.dart';

/// Screen 15, built to board `S05-directory`: the listed creators as cards with filters, a count
/// line, "Show more" and the one primary action that sends the person to the brief.
///
/// The [DirectoryCubit] comes from the `/creators` shell route, so the filters and the pages
/// loaded stay while a profile is open on top. With [choosing] (from "Change" on screen 17) a card
/// opens the booking for that creator instead of their profile (MC FR-022).
class DirectoryPage extends StatelessWidget {
  const DirectoryPage({super.key, this.choosing = false});

  final bool choosing;

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<DirectoryCubit, DirectoryState>(
      builder: (context, state) => DirectoryView(
        state: state,
        choosing: choosing,
        onSelect: (key, slug) =>
            unawaited(context.read<DirectoryCubit>().select(key, slug)),
        onShowMore: () => unawaited(context.read<DirectoryCubit>().showMore()),
        onRetry: () => unawaited(context.read<DirectoryCubit>().load()),
        onOpen: (card) => choosing
            ? context.go('/book/${Uri.encodeComponent(card.code)}')
            : unawaited(
                context.push('/creators/${Uri.encodeComponent(card.code)}'),
              ),
        onBrief: () => context.go(AppRoutes.home),
      ),
    );
  }
}

/// The screen for any [DirectoryState]; widget tests and goldens supply states directly.
class DirectoryView extends StatefulWidget {
  const DirectoryView({
    super.key,
    required this.state,
    required this.onSelect,
    required this.onShowMore,
    required this.onRetry,
    required this.onOpen,
    required this.onBrief,
    this.choosing = false,
  });

  final DirectoryState state;
  final bool choosing;
  final void Function(FilterKey key, String slug) onSelect;
  final VoidCallback onShowMore;
  final VoidCallback onRetry;
  final void Function(CreatorCard card) onOpen;
  final VoidCallback onBrief;

  @override
  State<DirectoryView> createState() => _DirectoryViewState();
}

class _DirectoryViewState extends State<DirectoryView> {
  bool _more = false;

  @override
  Widget build(BuildContext context) {
    final state = widget.state;
    final l10n = context.l10n;
    if (state.status == DirectoryStatus.failed && state.items.isEmpty) {
      return ErrorPage(onRetry: widget.onRetry);
    }
    final c = context.colors;
    final meta = ShootType.meta.copyWith(color: c.mute);
    final typeFilter = state.filter(FilterKey.type);
    final secondary = [
      for (final key in [FilterKey.place, FilterKey.specialty])
        for (final option
            in state.filter(key)?.options ?? const <FilterOption>[])
          (key, option),
    ];
    final shownChips = _more ? secondary : _compact(secondary);
    return ShootScaffold(
      child: Column(
        children: [
          const BrowseHeader(),
          Expanded(
            child: ListView(
              padding: EdgeInsets.zero,
              children: [
                Padding(
                  padding: const EdgeInsetsDirectional.fromSTEB(20, 12, 20, 0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    spacing: 16,
                    children: [
                      Semantics(
                        header: true,
                        child: CssLineBox(
                          key: const ValueKey('fidelity:h1'),
                          fontSize: 34,
                          height: 1.25,
                          child: Text(
                            l10n.mcDirectoryTitle,
                            style: ShootType.display.copyWith(
                              height: 1.25,
                              color: c.ink,
                            ),
                          ),
                        ),
                      ),
                      if (typeFilter != null && typeFilter.options.length > 1)
                        Semantics(
                          container: true,
                          label: l10n.mcTypeGroup,
                          child: ChipGroup(
                            children: [
                              for (final o in typeFilter.options)
                                ShootChip(
                                  label: o.name,
                                  on: o.selected,
                                  onTap: () =>
                                      widget.onSelect(FilterKey.type, o.slug),
                                ),
                            ],
                          ),
                        ),
                      if (secondary.isNotEmpty)
                        Semantics(
                          container: true,
                          label: l10n.mcFilterGroup,
                          child: ChipGroup(
                            children: [
                              for (final (key, o) in shownChips)
                                ShootChip(
                                  label: o.name,
                                  on: o.selected,
                                  onTap: () => widget.onSelect(key, o.slug),
                                ),
                              if (secondary.length > shownChips.length || _more)
                                MoreChip(
                                  label: _more ? l10n.mcLess : l10n.mcMore,
                                  onTap: () => setState(() => _more = !_more),
                                ),
                            ],
                          ),
                        ),
                      if (state.total > 0)
                        CssLineBox(
                          fontSize: 13,
                          height: 1.4,
                          child: Text(
                            l10n.mcCountLine(state.total),
                            style: meta,
                          ),
                        ),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsetsDirectional.fromSTEB(12, 16, 12, 0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    spacing: 16,
                    children: [
                      if (state.status == DirectoryStatus.loading)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 48),
                          child: Center(
                            child: CircularProgressIndicator.adaptive(),
                          ),
                        ),
                      if (state.isEmpty)
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 24),
                          child: EmptyState(
                            mark: const IconTile.large(
                              ShootIcons.searchQuestion,
                            ),
                            title: l10n.mcEmptyTitle,
                          ),
                        ),
                      for (var i = 0; i < state.items.length; i++)
                        CreatorDirectoryCard(
                          creator: state.items[i],
                          position: i,
                          onTap: () => widget.onOpen(state.items[i]),
                        ),
                      if (state.items.isNotEmpty)
                        _ShowMore(
                          state: state,
                          onShowMore: widget.onShowMore,
                          meta: meta,
                        ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        spacing: 10,
                        children: [
                          TopHit(
                            label: l10n.mcMatchYou,
                            chevron: true,
                            onPressed: widget.onBrief,
                          ),
                          CssLineBox(
                            fontSize: 13,
                            height: 1.4,
                            child: Text(
                              l10n.mcMatchHint,
                              textAlign: TextAlign.center,
                              style: meta,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
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

  /// The chosen chips and the first two of each group, in order.
  List<(FilterKey, FilterOption)> _compact(
    List<(FilterKey, FilterOption)> all,
  ) {
    final taken = <FilterKey, int>{};
    return [
      for (final entry in all)
        if (entry.$2.selected ||
            (taken[entry.$1] = (taken[entry.$1] ?? 0) + 1) <= 2)
          entry,
    ];
  }
}

class _ShowMore extends StatelessWidget {
  const _ShowMore({
    required this.state,
    required this.onShowMore,
    required this.meta,
  });

  final DirectoryState state;
  final VoidCallback onShowMore;
  final TextStyle meta;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Center(
      child: Wrap(
        crossAxisAlignment: WrapCrossAlignment.center,
        spacing: 6,
        children: [
          Text(l10n.mcShowing(state.shown, state.total), style: meta),
          if (state.canMore)
            state.status == DirectoryStatus.loadingMore
                ? Semantics(
                    label: l10n.mcLoadMore,
                    child: const SizedBox.square(
                      dimension: 16,
                      child: CircularProgressIndicator.adaptive(strokeWidth: 2),
                    ),
                  )
                : TextLink(
                    label: l10n.mcShowMore,
                    style: meta,
                    onTap: onShowMore,
                  ),
        ],
      ),
    );
  }
}
