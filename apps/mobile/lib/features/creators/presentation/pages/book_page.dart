import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/time/clock.dart';
import 'package:shoot_mobile/core/web/website_links.dart';
import 'package:shoot_mobile/core/widgets/css_line_box.dart';
import 'package:shoot_mobile/core/widgets/language_action.dart';
import 'package:shoot_mobile/core/widgets/message_banner.dart';
import 'package:shoot_mobile/core/widgets/shoot_scaffold.dart';
import 'package:shoot_mobile/core/widgets/text_link.dart';
import 'package:shoot_mobile/core/widgets/top_hit.dart';
import 'package:shoot_mobile/features/creators/domain/brief/brief_rules.dart';
import 'package:shoot_mobile/features/creators/domain/entities/creators.dart';
import 'package:shoot_mobile/features/site/domain/entities/brief_builder.dart';
import 'package:shoot_mobile/features/creators/domain/whatsapp_link.dart';
import 'package:shoot_mobile/features/creators/presentation/cubit/book_hire_cubits.dart';
import 'package:shoot_mobile/features/creators/presentation/cubit/brief_cubit.dart';
import 'package:shoot_mobile/features/creators/presentation/cubit/load_state.dart';
import 'package:shoot_mobile/features/creators/presentation/widgets/brief_bar.dart';
import 'package:shoot_mobile/features/creators/presentation/widgets/brief_format.dart';
import 'package:shoot_mobile/features/creators/presentation/widgets/creator_parts.dart';

/// Screen 17, built to board `S06b-book`: a short brief with the creator fixed. The persona is
/// limited to the creator's types, the place to the emirates they work in. A complete brief opens
/// WhatsApp with the message (the fallback until Quick Match, feature 012, replaces [open]'s use);
/// no account is asked for.
class BookPage extends StatelessWidget {
  const BookPage({
    super.key,
    required this.draft,
    required this.clock,
    required this.open,
  });

  final BriefDraft draft;
  final Clock clock;
  final UrlOpener open;

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<BookCubit, LoadState<BookData>>(
      builder: (context, state) => LoadView<BookData>(
        state: state,
        onRetry: () => unawaited(context.read<BookCubit>().load()),
        builder: (context, data) => BookView(
          data: data,
          draft: draft,
          today: briefToday(clock.now()),
          open: open,
          onBack: () => context.canPop()
              ? context.pop()
              : context.go(
                  '/creators/${Uri.encodeComponent(data.profile.code)}',
                ),
          onChange: () => unawaited(context.push('/creators?book=1')),
        ),
      ),
    );
  }
}

/// The screen for loaded [BookData]; it makes its own `BriefCubit` once.
class BookView extends StatefulWidget {
  const BookView({
    super.key,
    required this.data,
    required this.draft,
    required this.today,
    required this.open,
    required this.onBack,
    required this.onChange,
  });

  final BookData data;
  final BriefDraft draft;
  final String today;
  final UrlOpener open;
  final VoidCallback onBack;
  final VoidCallback onChange;

  @override
  State<BookView> createState() => _BookViewState();
}

class _BookViewState extends State<BookView> {
  late final BriefCubit? _cubit = _create();

  BriefCubit? _create() {
    final builder = widget.data.context.builder;
    if (builder == null) return null;
    return BriefCubit(
      rules: BriefRules(
        builder,
        creator: BriefCreator.fromProfile(widget.data.profile),
      ),
      today: widget.today,
      initial: widget.draft.values,
      draft: widget.draft,
    );
  }

  @override
  void dispose() {
    unawaited(_cubit?.close());
    super.dispose();
  }

  String _date(String iso) =>
      formatBriefDate(iso, Localizations.localeOf(context).languageCode);

  Future<void> _send({required bool plain}) async {
    final l10n = context.l10n;
    final profile = widget.data.profile;
    final number = widget.data.context.whatsappNumber;
    final cubit = _cubit;
    final message = plain
        ? l10n.mcAskMessage(profile.name, profile.displayCode)
        : cubit?.message(
            formatDate: _date,
            creatorLine: l10n.mcCreatorLineLabel(
              profile.name,
              profile.displayCode,
            ),
          );
    final link = number == null || message == null
        ? null
        : whatsappLink(number, message);
    if (link == null) {
      ScaffoldMessenger.maybeOf(context)
          ?.showSnackBar(SnackBar(content: Text(l10n.mcContactNotAvailable)));
      return;
    }
    if (await widget.open(link)) cubit?.sent();
  }

  Future<void> _pickDate(BuildContext context, BuilderSlot slot) async {
    final cubit = _cubit!;
    final today = DateTime.parse(widget.today);
    final picked = await showDatePicker(
      context: context,
      initialDate: today,
      firstDate: today,
      lastDate: today.add(const Duration(days: 365 * 2)),
    );
    if (picked != null) {
      cubit.setText(
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
    final profile = widget.data.profile;
    final first = profile.name.trim().split(RegExp(r'\s+')).first;
    final cubit = _cubit;
    return ShootScaffold(
      child: Column(
        children: [
          FlowHeader(
            backLabel: l10n.mcBackToProfile(profile.name),
            onBack: widget.onBack,
            end: const LanguageAction(square: true),
          ),
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
                            Semantics(
                              header: true,
                              child: CssLineBox(
                                key: const ValueKey('fidelity:h1'),
                                fontSize: 30,
                                height: 1.2,
                                child: Text(
                                  l10n.mcBookTitle(profile.name),
                                  style: ShootType.display.copyWith(
                                    fontSize: 30,
                                    height: 1.2,
                                    color: c.ink,
                                  ),
                                ),
                              ),
                            ),
                            CssLineBox(
                              fontSize: 15,
                              height: 1.6,
                              child: Text(
                                l10n.mcBookBody,
                                style: ShootType.body.copyWith(
                                  color: c.bodyInk,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsetsDirectional.fromSTEB(
                          20,
                          16,
                          20,
                          0,
                        ),
                        child: _CreatorLine(
                          profile: profile,
                          onChange: widget.onChange,
                        ),
                      ),
                      if (cubit == null)
                        Padding(
                          padding: const EdgeInsetsDirectional.fromSTEB(
                            20,
                            20,
                            20,
                            0,
                          ),
                          child: _Fallback(
                            message: l10n.mcCannotComplete,
                            onAsk: () => unawaited(_send(plain: true)),
                          ),
                        )
                      else
                        BlocBuilder<BriefCubit, BriefState>(
                          bloc: cubit,
                          builder: (context, state) => Padding(
                            padding: const EdgeInsetsDirectional.fromSTEB(
                              12,
                              20,
                              12,
                              0,
                            ),
                            child: state.canComplete
                                ? BriefBar(
                                    state: state,
                                    formatDate: _date,
                                    onChoose: cubit.choose,
                                    onReopen: cubit.reopen,
                                    onPickDate: (slot) =>
                                        unawaited(_pickDate(context, slot)),
                                    groupLabelFor: (slot) =>
                                        state.rules.isPlaceSlot(slot)
                                        ? l10n.mcWhereWorks(first)
                                        : slot.groupLabel,
                                    action: TopHit(
                                      label: l10n.mcBookWith(first),
                                      chevron: true,
                                      price: state.openCount > 0
                                          ? l10n.mcStepsLeft(state.openCount)
                                          : null,
                                      onPressed: state.isComplete
                                          ? () => unawaited(_send(plain: false))
                                          : () {
                                              final next = state.nextSlot;
                                              if (next != null)
                                                cubit.reopen(next);
                                            },
                                    ),
                                  )
                                : _Fallback(
                                    message: l10n.mcCannotComplete,
                                    onAsk: () => unawaited(_send(plain: true)),
                                  ),
                          ),
                        ),
                      const Spacer(),
                      Padding(
                        padding: const EdgeInsetsDirectional.fromSTEB(
                          20,
                          16,
                          20,
                          18,
                        ),
                        child: CssLineBox(
                          fontSize: 13,
                          height: 1.4,
                          child: Text(
                            l10n.mcNoAccountHint,
                            textAlign: TextAlign.center,
                            style: ShootType.meta.copyWith(color: c.mute),
                          ),
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

class _CreatorLine extends StatelessWidget {
  const _CreatorLine({required this.profile, required this.onChange});

  final CreatorProfile profile;
  final VoidCallback onChange;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final l10n = context.l10n;
    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border.symmetric(horizontal: BorderSide(color: c.hair)),
      ),
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 64),
        child: Row(
          spacing: 12,
          children: [
            CreatorAvatar(photo: profile.photo),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                spacing: 1,
                children: [
                  Text(
                    profile.name,
                    style: ShootType.row.copyWith(
                      color: c.ink,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Text(
                    l10n.mcCreatorLine(profile.types, profile.displayCode),
                    style: ShootType.meta.copyWith(color: c.mute),
                  ),
                ],
              ),
            ),
            TextLink(
              label: l10n.mcChange,
              style: ShootType.body,
              onTap: onChange,
            ),
          ],
        ),
      ),
    );
  }
}

class _Fallback extends StatelessWidget {
  const _Fallback({required this.message, required this.onAsk});

  final String message;
  final VoidCallback onAsk;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 12,
      children: [
        MessageBanner(text: message, tone: BannerTone.error),
        TopHit(label: context.l10n.mcAskWhatsapp, onPressed: onAsk),
      ],
    );
  }
}
