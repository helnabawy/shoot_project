import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/routing/app_routes.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/time/clock.dart';
import 'package:shoot_mobile/core/web/website_links.dart';
import 'package:shoot_mobile/core/widgets/css_line_box.dart';
import 'package:shoot_mobile/core/widgets/shoot_scaffold.dart';
import 'package:shoot_mobile/core/widgets/text_link.dart';
import 'package:shoot_mobile/core/widgets/top_hit.dart';
import 'package:shoot_mobile/features/creators/domain/brief/brief_rules.dart';
import 'package:shoot_mobile/features/creators/domain/whatsapp_link.dart';
import 'package:shoot_mobile/features/creators/presentation/cubit/book_hire_cubits.dart';
import 'package:shoot_mobile/features/creators/presentation/cubit/brief_cubit.dart';
import 'package:shoot_mobile/features/creators/presentation/cubit/load_state.dart';
import 'package:shoot_mobile/features/creators/presentation/widgets/brief_bar.dart';
import 'package:shoot_mobile/features/creators/presentation/widgets/brief_format.dart';
import 'package:shoot_mobile/features/creators/presentation/widgets/creator_parts.dart';
import 'package:shoot_mobile/features/creators/presentation/widgets/faq_list.dart';
import 'package:shoot_mobile/features/site/domain/entities/brief_builder.dart';

/// Screen 19, built to board `S05c-hire`: an intent page at `/hire/{slug}` with its brief filled in
/// from the page's presets (and still changeable), the one primary action "See who's free", up to
/// six matching creators and the page's questions. A complete brief opens WhatsApp with the message
/// until Quick Match (feature 012) takes over.
class HireRoutePage extends StatelessWidget {
  const HireRoutePage({super.key, required this.clock, required this.open});

  final Clock clock;
  final UrlOpener open;

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<HireCubit, LoadState<HireData>>(
      builder: (context, state) {
        final cubit = context.read<HireCubit>();
        // A page reached by an earlier or the other language's address moves to its own.
        if (state case LoadDone<HireData>(:final value)) {
          final path = value.page.path;
          final here = GoRouterState.of(context).uri.path;
          if (path != here && Uri.decodeComponent(here) != path) {
            WidgetsBinding.instance.addPostFrameCallback(
              (_) => context.mounted ? context.replace(path) : null,
            );
          }
        }
        return LoadView<HireData>(
          state: state,
          onRetry: () => unawaited(cubit.load()),
          builder: (context, data) => HireView(
            data: data,
            today: briefToday(clock.now()),
            open: open,
            onToggle: cubit.toggle,
            onCreator: (code) => unawaited(
              context.push('/creators/${Uri.encodeComponent(code)}'),
            ),
            onSeeAll: (query) => context.go(
              Uri(path: AppRoutes.creators, queryParameters: query).toString(),
            ),
          ),
        );
      },
    );
  }
}

/// The screen for loaded [HireData]; it makes its own `BriefCubit` once, from the page's presets.
class HireView extends StatefulWidget {
  const HireView({
    super.key,
    required this.data,
    required this.today,
    required this.open,
    required this.onToggle,
    required this.onCreator,
    required this.onSeeAll,
  });

  final HireData data;
  final String today;
  final UrlOpener open;
  final void Function(int index) onToggle;
  final void Function(String code) onCreator;
  final void Function(Map<String, String> query) onSeeAll;

  @override
  State<HireView> createState() => _HireViewState();
}

class _HireViewState extends State<HireView> {
  late final BriefCubit? _cubit = _create();

  BriefCubit? _create() {
    final builder = widget.data.builder;
    if (builder == null) return null;
    return BriefCubit(
      rules: BriefRules(builder),
      today: widget.today,
      initial: widget.data.page.preset,
    );
  }

  @override
  void dispose() {
    unawaited(_cubit?.close());
    super.dispose();
  }

  String _date(String iso) =>
      formatBriefDate(iso, Localizations.localeOf(context).languageCode);

  Future<void> _send() async {
    final number = widget.data.whatsappNumber;
    final message = _cubit?.message(formatDate: _date);
    final link = number == null || message == null
        ? null
        : whatsappLink(number, message);
    if (link == null) {
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        SnackBar(content: Text(context.l10n.mcContactNotAvailable)),
      );
      return;
    }
    await widget.open(link);
  }

  Future<void> _pickDate(BuilderSlot slot) async {
    final today = DateTime.parse(widget.today);
    final picked = await showDatePicker(
      context: context,
      initialDate: today,
      firstDate: today,
      lastDate: today.add(const Duration(days: 365 * 2)),
    );
    if (picked != null) {
      _cubit?.setText(
        slot,
        '${picked.year.toString().padLeft(4, '0')}-'
        '${picked.month.toString().padLeft(2, '0')}-'
        '${picked.day.toString().padLeft(2, '0')}',
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    final page = widget.data.page;
    final cubit = _cubit;
    final shown = page.creators.length;
    return ShootScaffold(
      child: Column(
        children: [
          const BrowseHeader(),
          Expanded(
            child: ListView(
              padding: const EdgeInsetsDirectional.only(bottom: 24),
              children: [
                Padding(
                  padding: const EdgeInsetsDirectional.fromSTEB(20, 8, 20, 0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    spacing: 10,
                    children: [
                      Semantics(
                        header: true,
                        child: CssLineBox(
                          key: const ValueKey('fidelity:h1'),
                          fontSize: 30,
                          height: 1.2,
                          child: Text(
                            page.title,
                            style: ShootType.display.copyWith(
                              fontSize: 30,
                              height: 1.2,
                              color: c.ink,
                            ),
                          ),
                        ),
                      ),
                      if (page.intro case final intro? when intro.isNotEmpty)
                        CssLineBox(
                          fontSize: 15,
                          height: 1.6,
                          child: Text(
                            intro,
                            style: ShootType.body.copyWith(color: c.bodyInk),
                          ),
                        ),
                    ],
                  ),
                ),
                if (cubit != null) ...[
                  Padding(
                    padding: const EdgeInsetsDirectional.fromSTEB(
                      12,
                      20,
                      12,
                      0,
                    ),
                    child: BlocBuilder<BriefCubit, BriefState>(
                      bloc: cubit,
                      builder: (context, state) => BriefBar(
                        state: state,
                        formatDate: _date,
                        onChoose: cubit.choose,
                        onReopen: cubit.reopen,
                        onPickDate: (slot) => unawaited(_pickDate(slot)),
                        action: TopHit(
                          label: l10n.mcSeeWhoFree,
                          chevron: true,
                          price: state.openCount > 0
                              ? l10n.mcStepsLeft(state.openCount)
                              : null,
                          onPressed: state.isComplete
                              ? () => unawaited(_send())
                              : () {
                                  final next = state.nextSlot;
                                  if (next != null) cubit.reopen(next);
                                },
                        ),
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsetsDirectional.fromSTEB(
                      20,
                      10,
                      20,
                      0,
                    ),
                    child: CssLineBox(
                      fontSize: 13,
                      height: 1.4,
                      child: Text(
                        l10n.mcBriefPrefilled,
                        style: ShootType.meta.copyWith(color: c.mute),
                      ),
                    ),
                  ),
                ],
                if (shown > 0 && page.creatorTotal > 0)
                  Padding(
                    padding: const EdgeInsetsDirectional.fromSTEB(
                      20,
                      28,
                      20,
                      0,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Padding(
                          padding: const EdgeInsetsDirectional.only(bottom: 10),
                          child: Semantics(
                            header: true,
                            child: Text(
                              l10n.mcProsWhoCan(page.creatorTotal),
                              style: ShootType.heading.copyWith(color: c.ink),
                            ),
                          ),
                        ),
                        for (var i = 0; i < page.creators.length; i++)
                          CreatorRow(
                            creator: page.creators[i],
                            sceneIndex: i,
                            onTap: () =>
                                widget.onCreator(page.creators[i].code),
                          ),
                        DecoratedBox(
                          decoration: BoxDecoration(
                            border: Border(top: BorderSide(color: c.hair)),
                          ),
                          child: const SizedBox(width: double.infinity),
                        ),
                        if (page.creatorTotal > shown)
                          Align(
                            alignment: AlignmentDirectional.centerStart,
                            child: TextLink(
                              label: l10n.mcSeeAll(page.creatorTotal),
                              style: ShootType.body,
                              onTap: () => widget.onSeeAll(_seeAllQuery()),
                            ),
                          ),
                      ],
                    ),
                  ),
                if (page.faq.isNotEmpty)
                  Padding(
                    padding: const EdgeInsetsDirectional.fromSTEB(
                      20,
                      20,
                      20,
                      0,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Padding(
                          padding: const EdgeInsetsDirectional.only(bottom: 10),
                          child: Semantics(
                            header: true,
                            child: Text(
                              l10n.mcQuestions,
                              style: ShootType.heading.copyWith(color: c.ink),
                            ),
                          ),
                        ),
                        FaqList(
                          items: page.faq,
                          expanded: widget.data.expanded,
                          onToggle: widget.onToggle,
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

  /// "See all n" opens the directory for the page's professional type (the persona slot's preset).
  Map<String, String> _seeAllQuery() {
    final builder = widget.data.builder;
    final persona = builder == null ? null : BriefRules(builder).personaSlot;
    final type = persona == null ? null : _cubit?.state.values[persona.token];
    return {if (type != null && type.isNotEmpty) 'type': type};
  }
}
