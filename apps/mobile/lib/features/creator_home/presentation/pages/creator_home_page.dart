import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart' hide TextDirection;
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/routing/app_routes.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_colors.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/time/clock.dart';
import 'package:shoot_mobile/core/widgets/icon_tile.dart';
import 'package:shoot_mobile/core/widgets/language_action.dart';
import 'package:shoot_mobile/core/widgets/message_banner.dart';
import 'package:shoot_mobile/core/widgets/photo_tile.dart';
import 'package:shoot_mobile/core/widgets/progress_bar.dart';
import 'package:shoot_mobile/core/widgets/secondary_button.dart';
import 'package:shoot_mobile/core/widgets/shoot_header.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon_button.dart';
import 'package:shoot_mobile/core/widgets/shoot_image.dart';
import 'package:shoot_mobile/core/widgets/shoot_panel.dart';
import 'package:shoot_mobile/core/widgets/shoot_row.dart';
import 'package:shoot_mobile/core/widgets/shoot_scaffold.dart';
import 'package:shoot_mobile/core/widgets/status_badge.dart';
import 'package:shoot_mobile/core/widgets/top_hit.dart';
import 'package:shoot_mobile/core/widgets/wordmark.dart';
import 'package:shoot_mobile/features/creator_account/domain/entities/creator_account.dart'
    show StepKey;
import 'package:shoot_mobile/features/creator_account/presentation/widgets/creator_parts.dart';
import 'package:shoot_mobile/features/creator_home/domain/entities/creator_home.dart';
import 'package:shoot_mobile/features/creator_home/presentation/cubit/creator_home_cubit.dart';

/// How many following requests show under the card (the domain's `NEXT_LIMIT`).
const nextLimit = 5;

/// The profile has this many steps; the not-live panel counts how many are done (web `PROFILE_STEPS`).
const profileSteps = 7;

/// A signed-in creator's `/` (feature 023, screens 64, 65 and 67): who they are, the one request to
/// answer, the next shoot and the places to manage.
class CreatorHomePage extends StatefulWidget {
  const CreatorHomePage({
    super.key,
    required this.create,
    this.clock = const SystemClock(),
  });

  final CreatorHomeCubit Function() create;
  final Clock clock;

  @override
  State<CreatorHomePage> createState() => _CreatorHomePageState();
}

class _CreatorHomePageState extends State<CreatorHomePage>
    with WidgetsBindingObserver {
  late final CreatorHomeCubit _cubit = widget.create();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    unawaited(_cubit.load());
  }

  /// Back to the app: the queue may have changed while it was away (FR-029).
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) unawaited(_cubit.refresh());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    unawaited(_cubit.close());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider.value(
      value: _cubit,
      child: BlocBuilder<CreatorHomeCubit, CreatorHomeState>(
        builder: (context, state) => CreatorHomeView(
          state: state,
          now: widget.clock.now(),
          onRetry: _cubit.load,
          onRefresh: _cubit.refresh,
          onAccept: _cubit.accept,
          onDecline: (item) => _decline(context, item),
          onOpen: (path) async {
            await context.push(path);
            if (mounted) unawaited(_cubit.refresh());
          },
        ),
      ),
    );
  }

  Future<void> _decline(BuildContext context, HomeItem item) async {
    final state = _cubit.state;
    if (state is! CreatorHomeLoaded) return;
    final answer = await showModalBottomSheet<DeclineAnswer>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) =>
          DeclineSheet(item: item, reasons: state.home.reasons),
    );
    if (answer != null) {
      unawaited(_cubit.decline(item, reason: answer.reason, note: answer.note));
    }
  }
}

/// What the Decline sheet returns: the optional reason and note.
final class DeclineAnswer {
  const DeclineAnswer({this.reason, this.note});

  final String? reason;
  final String? note;
}

/// Renders any [CreatorHomeState]; every action goes through a callback.
class CreatorHomeView extends StatelessWidget {
  const CreatorHomeView({
    super.key,
    required this.state,
    required this.now,
    required this.onRetry,
    required this.onRefresh,
    required this.onAccept,
    required this.onDecline,
    required this.onOpen,
  });

  final CreatorHomeState state;
  final DateTime now;
  final VoidCallback onRetry;
  final Future<void> Function() onRefresh;
  final void Function(HomeItem item) onAccept;
  final void Function(HomeItem item) onDecline;
  final void Function(String path) onOpen;

  @override
  Widget build(BuildContext context) {
    return switch (state) {
      CreatorHomeLoading() => const CreatorLoading(),
      CreatorHomeFailed(:final failure) => creatorFailure(failure, onRetry),
      final CreatorHomeLoaded loaded => _Loaded(
        loaded: loaded,
        now: now,
        onRefresh: onRefresh,
        onAccept: onAccept,
        onDecline: onDecline,
        onOpen: onOpen,
      ),
    };
  }
}

/// Western digits in both languages, like the boards (`ar-AE-u-nu-latn` on the web).
String _western(String text) => text.replaceAllMapped(
  RegExp('[٠-٩]'),
  (m) => '${m[0]!.codeUnitAt(0) - 0x0660}',
);

String _day(BuildContext context, String date) => _western(
  DateFormat(
    'EEE d MMM',
    Localizations.localeOf(context).toString(),
  ).format(DateTime.parse('${date}T12:00:00Z')),
);

String _dayAndTime(BuildContext context, String? date, String? time) {
  final l10n = context.l10n;
  if (date == null) return l10n.chDateToAgree;
  final day = _day(context, date);
  return time == null ? day : '$day, $time';
}

/// The answer-by time: just the clock when it is today, else the day and the clock (UAE time).
String _deadline(BuildContext context, DateTime at, DateTime now) {
  final dubai = at.toUtc().add(const Duration(hours: 4));
  final today = now.toUtc().add(const Duration(hours: 4));
  final locale = Localizations.localeOf(context).toString();
  final clock = _western(DateFormat('HH:mm', locale).format(dubai));
  final sameDay =
      dubai.year == today.year &&
      dubai.month == today.month &&
      dubai.day == today.day;
  final text = sameDay
      ? clock
      : '${_western(DateFormat('EEE d MMM', locale).format(dubai))}, $clock';
  return context.l10n.caAnswerBy(text);
}

String _sent(BuildContext context, DateTime at, DateTime now) {
  final l10n = context.l10n;
  final minutes = now.difference(at).inMinutes.clamp(0, 1 << 30);
  if (minutes < 60) return l10n.chSentMinutes(minutes);
  if (minutes < 60 * 24) return l10n.chSentHours(minutes ~/ 60);
  return l10n.chSentDays(minutes ~/ (60 * 24));
}

String _title(BuildContext context, HomeItem item) {
  final l10n = context.l10n;
  if (item.emirate.isEmpty) {
    return item.occasion.isEmpty ? item.profession : item.occasion;
  }
  return item.occasion.isEmpty
      ? l10n.chTitleNoOccasion(item.profession, item.emirate)
      : l10n.chTitleLine(item.occasion, item.emirate);
}

String _stepLabel(BuildContext context, String step) {
  for (final key in StepKey.values) {
    if (key.name == step) return stepName(context, key);
  }
  return step;
}

typedef _Line = ({String label, String value, bool tabular});

List<_Line> _lines(BuildContext context, HomeItem item, DateTime now) {
  final l10n = context.l10n;
  return switch (item) {
    HomeBooking() => [
      (
        label: l10n.chLabelDate,
        value: _dayAndTime(context, item.date, item.time),
        tabular: true,
      ),
      if (item.length != null)
        (label: l10n.chLabelLength, value: item.length!, tabular: false),
      (label: l10n.chLabelClient, value: item.client, tabular: false),
      (label: l10n.chLabelReference, value: item.ref, tabular: true),
    ],
    HomeBrief() => [
      (
        label: l10n.chLabelDate,
        value: _dayAndTime(context, item.date, null),
        tabular: true,
      ),
      (label: l10n.chLabelNeeds, value: item.profession, tabular: false),
      (
        label: l10n.chLabelSent,
        value: _sent(context, item.sentAt, now),
        tabular: false,
      ),
      (label: l10n.chLabelReference, value: item.ref, tabular: true),
      if (item.budgetFils != null)
        (
          label: l10n.chLabelPrice,
          value:
              'AED ${NumberFormat.decimalPattern('en').format(item.budgetFils! / 100)}',
          tabular: true,
        ),
    ],
  };
}

class _Loaded extends StatelessWidget {
  const _Loaded({
    required this.loaded,
    required this.now,
    required this.onRefresh,
    required this.onAccept,
    required this.onDecline,
    required this.onOpen,
  });

  final CreatorHomeLoaded loaded;
  final DateTime now;
  final Future<void> Function() onRefresh;
  final void Function(HomeItem item) onAccept;
  final void Function(HomeItem item) onDecline;
  final void Function(String path) onOpen;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final home = loaded.home;
    final live = home.mode == HomeMode.live;
    const inset = EdgeInsetsDirectional.symmetric(horizontal: 8);
    return ShootScaffold(
      child: Column(
        children: [
          ShootHeader(
            leading: Wordmark(label: l10n.appTitle),
            trailing: [
              const LanguageAction(),
              ShootIconButton(
                icon: ShootIcons.person,
                label: l10n.mlAccountButton,
                onPressed: () => onOpen(AppRoutes.account),
              ),
              ShootIconButton(
                icon: ShootIcons.menu,
                label: l10n.mlOpenMenu,
                onPressed: () => onOpen('/menu'),
              ),
            ],
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: onRefresh,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsetsDirectional.fromSTEB(12, 20, 12, 24),
                children: [
                  Padding(
                    padding: inset,
                    child: _Identity(home: home),
                  ),
                  if (home.counts != null) ...[
                    const SizedBox(height: 18),
                    Padding(
                      padding: inset,
                      child: _Counts(counts: home.counts!, onOpen: onOpen),
                    ),
                  ],
                  if (loaded.notice != null) ...[
                    const SizedBox(height: 20),
                    Padding(
                      padding: inset,
                      child: MessageBanner(
                        text: switch (loaded.notice!) {
                          HomeNotice.closed => l10n.chNoticeClosed,
                          HomeNotice.notSent => l10n.chNoticeNotSent,
                        },
                        tone: BannerTone.error,
                      ),
                    ),
                  ],
                  const SizedBox(height: 28),
                  if (live)
                    _Queue(
                      loaded: loaded,
                      now: now,
                      onAccept: onAccept,
                      onDecline: onDecline,
                      onOpen: onOpen,
                    )
                  else
                    _NotLive(home: home, onOpen: onOpen),
                  if (live && home.next != null) ...[
                    const SizedBox(height: 28),
                    _NextShoot(next: home.next!, onOpen: onOpen),
                  ],
                  const SizedBox(height: 28),
                  _Manage(home: home, live: live, onOpen: onOpen),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Identity extends StatelessWidget {
  const _Identity({required this.home});

  final CreatorHome home;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    final (label, tone) = switch (home.mode) {
      HomeMode.live => (l10n.chLive, BadgeTone.success),
      HomeMode.incomplete => (l10n.chIncomplete, BadgeTone.attention),
      HomeMode.review => (l10n.chReview, BadgeTone.neutral),
      HomeMode.paused => (l10n.chHidden, BadgeTone.neutral),
    };
    final meta = [
      if (home.professions.isNotEmpty) home.professions.join(' · '),
      if (home.code != null) home.code!,
    ].join(' · ');
    return Row(
      spacing: 12,
      children: [
        home.photo == null
            ? const PhotoTile()
            : SizedBox.square(
                dimension: ShootSize.photoTile,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(ShootRadius.photoTile),
                  child: ShootImage(
                    home.photo,
                    width: ShootSize.photoTile,
                    height: ShootSize.photoTile,
                  ),
                ),
              ),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            spacing: 2,
            children: [
              Text(
                home.name,
                style: ShootType.heading.copyWith(
                  fontWeight: FontWeight.w700,
                  height: 1.2,
                  color: c.ink,
                ),
              ),
              if (meta.isNotEmpty)
                Text(meta, style: ShootType.meta.copyWith(color: c.mute)),
            ],
          ),
        ),
        StatusBadge(label: label, tone: tone),
      ],
    );
  }
}

class _Counts extends StatelessWidget {
  const _Counts({required this.counts, required this.onOpen});

  final HomeCounts counts;
  final void Function(String path) onOpen;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    Widget cell(String label, int value, bool first, VoidCallback onTap) {
      return Expanded(
        child: Semantics(
          button: true,
          label: '$value $label',
          excludeSemantics: true,
          child: InkWell(
            onTap: onTap,
            child: Container(
              constraints: const BoxConstraints(minHeight: 44),
              padding: EdgeInsetsDirectional.fromSTEB(
                first ? 0 : 12,
                12,
                first ? 12 : 12,
                12,
              ),
              decoration: BoxDecoration(
                border: first
                    ? null
                    : BorderDirectional(start: BorderSide(color: c.hair)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                spacing: 2,
                children: [
                  Text(
                    '$value',
                    style: ShootType.num(
                      ShootType.title.copyWith(height: 1.1, color: c.ink),
                    ),
                  ),
                  Text(label, style: ShootType.meta.copyWith(color: c.mute)),
                ],
              ),
            ),
          ),
        ),
      );
    }

    return DecoratedBox(
      key: const ValueKey('fidelity:stats'),
      decoration: BoxDecoration(
        border: Border.symmetric(horizontal: BorderSide(color: c.hair)),
      ),
      child: Row(
        children: [
          cell(l10n.chToAnswer, counts.toAnswer, true, () {}),
          cell(
            l10n.chComingUp,
            counts.comingUp,
            false,
            () => onOpen(AppRoutes.accountBookings),
          ),
          cell(
            l10n.chCompleted,
            counts.completed,
            false,
            () => onOpen(AppRoutes.accountBookings),
          ),
        ],
      ),
    );
  }
}

class _Queue extends StatelessWidget {
  const _Queue({
    required this.loaded,
    required this.now,
    required this.onAccept,
    required this.onDecline,
    required this.onOpen,
  });

  final CreatorHomeLoaded loaded;
  final DateTime now;
  final void Function(HomeItem item) onAccept;
  final void Function(HomeItem item) onDecline;
  final void Function(String path) onOpen;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    final queue = loaded.home.queue;
    final card = queue.isEmpty ? null : queue.first;
    final rest = queue.skip(1).take(nextLimit).toList();
    final hidden = queue.skip(1 + nextLimit).toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsetsDirectional.fromSTEB(8, 0, 8, 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Flexible(child: GroupText(l10n.chAnswerTitle)),
              if (card != null)
                Flexible(
                  child: MetaText(l10n.chPosition('1', '${queue.length}')),
                ),
            ],
          ),
        ),
        if (card == null)
          ShootPanel(
            key: const ValueKey('fidelity:card'),
            padding: const EdgeInsets.all(16),
            child: Row(
              spacing: 12,
              children: [
                _SuccessTile(color: c),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    spacing: 2,
                    children: [
                      Text(
                        l10n.chUpToDate,
                        style: ShootType.heading.copyWith(
                          fontSize: 17,
                          color: c.ink,
                        ),
                      ),
                      MetaText(l10n.chUpToDateHint),
                    ],
                  ),
                ),
              ],
            ),
          )
        else ...[
          _Card(
            item: card,
            now: now,
            answering: loaded.answering == card.key,
            onAccept: onAccept,
            onDecline: onDecline,
            onOpen: onOpen,
          ),
          if (rest.isNotEmpty || hidden.isNotEmpty)
            Padding(
              padding: const EdgeInsetsDirectional.fromSTEB(8, 12, 8, 0),
              child: Column(
                children: [
                  for (final (i, item) in rest.indexed)
                    _NextRow(item: item, first: i == 0),
                  if (hidden.isNotEmpty)
                    ShootRow(
                      label: l10n.chSeeAll,
                      trailing: MetaText('+${hidden.length}'),
                      onTap: () => onOpen(
                        hidden.any((i) => i is HomeBrief)
                            ? AppRoutes.accountInbox
                            : AppRoutes.accountBookings,
                      ),
                      divider: RowDivider.top,
                    ),
                ],
              ),
            ),
        ],
      ],
    );
  }
}

class _SuccessTile extends StatelessWidget {
  const _SuccessTile({required this.color});

  final ShootColors color;

  @override
  Widget build(BuildContext context) => ExcludeSemantics(
    child: Container(
      width: 30,
      height: 30,
      decoration: BoxDecoration(
        color: color.success,
        borderRadius: BorderRadius.circular(ShootRadius.tile),
      ),
      child: Icon(Icons.check, size: 16, color: color.onSuccess),
    ),
  );
}

class _Card extends StatelessWidget {
  const _Card({
    required this.item,
    required this.now,
    required this.answering,
    required this.onAccept,
    required this.onDecline,
    required this.onOpen,
  });

  final HomeItem item;
  final DateTime now;
  final bool answering;
  final void Function(HomeItem item) onAccept;
  final void Function(HomeItem item) onDecline;
  final void Function(String path) onOpen;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    final booking = item is HomeBooking;
    final hasPrice =
        item is HomeBrief && (item as HomeBrief).budgetFils != null;
    final lines = _lines(context, item, now);
    return ShootPanel(
      key: const ValueKey('fidelity:card'),
      padding: const EdgeInsetsDirectional.fromSTEB(12, 16, 12, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsetsDirectional.symmetric(horizontal: 4),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Flexible(
                  child: Text(
                    booking ? l10n.chKindBooking : l10n.chKindBrief,
                    style: ShootType.meta.copyWith(
                      color: c.mute,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                if (item case final HomeBooking b)
                  Flexible(
                    child: StatusBadge(
                      label: _deadline(context, b.respondBy, now),
                      tone: BadgeTone.attention,
                    ),
                  ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsetsDirectional.fromSTEB(4, 8, 4, 0),
            child: Text(
              _title(context, item),
              style: ShootType.title.copyWith(
                fontSize: 22,
                height: 1.25,
                color: c.ink,
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsetsDirectional.fromSTEB(4, 14, 4, 0),
            child: Column(
              children: [
                for (final line in lines)
                  Container(
                    constraints: const BoxConstraints(minHeight: 38),
                    padding: const EdgeInsetsDirectional.symmetric(vertical: 9),
                    decoration: BoxDecoration(
                      border: Border(top: BorderSide(color: c.hair)),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.baseline,
                      textBaseline: TextBaseline.alphabetic,
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      spacing: 12,
                      children: [
                        Text(
                          line.label,
                          style: ShootType.body.copyWith(
                            height: 1.3,
                            color: c.mute,
                          ),
                        ),
                        Flexible(
                          child: Text(
                            line.value,
                            textAlign: TextAlign.end,
                            textDirection: line.tabular
                                ? TextDirection.ltr
                                : null,
                            style:
                                (line.tabular
                                ? ShootType.num
                                : (TextStyle s) => s)(
                                  ShootType.body.copyWith(
                                    height: 1.3,
                                    fontWeight: FontWeight.w500,
                                    color: c.ink,
                                  ),
                                ),
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Row(
            spacing: 8,
            children: [
              Expanded(
                flex: 14,
                child: TopHit(
                  label: l10n.chAccept,
                  leading: ShootIcons.check,
                  centered: true,
                  loading: answering,
                  onPressed: () => onAccept(item),
                ),
              ),
              Expanded(
                flex: 10,
                child: SizedBox(
                  height: ShootSize.topHitHeight,
                  child: SecondaryButton(
                    label: l10n.chDecline,
                    onPressed: answering ? null : () => onDecline(item),
                  ),
                ),
              ),
            ],
          ),
          Padding(
            padding: const EdgeInsetsDirectional.fromSTEB(4, 10, 4, 0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  booking
                      ? l10n.chNoteBooking
                      : hasPrice
                      ? l10n.chNoteBriefPrice
                      : l10n.chNoteBrief,
                  style: ShootType.meta.copyWith(height: 1.5, color: c.mute),
                ),
                if (hasPrice)
                  InkWell(
                    onTap: () => onOpen(AppRoutes.accountInbox),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Text(
                        l10n.chPriceInInbox,
                        style: ShootType.meta.copyWith(
                          color: c.ink,
                          fontWeight: FontWeight.w500,
                          decoration: TextDecoration.underline,
                        ),
                      ),
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

class _NextRow extends StatelessWidget {
  const _NextRow({required this.item, required this.first});

  final HomeItem item;
  final bool first;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    final sub = item.date == null
        ? l10n.chDateToAgree
        : _day(context, item.date!);
    return Container(
      constraints: const BoxConstraints(minHeight: 60),
      padding: const EdgeInsetsDirectional.symmetric(vertical: 4),
      decoration: BoxDecoration(
        border: Border(
          top: BorderSide(color: c.hair),
          bottom: BorderSide(color: c.hair),
        ),
      ),
      child: Row(
        spacing: 12,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              spacing: 2,
              children: [
                Text(
                  _title(context, item),
                  style: ShootType.row.copyWith(color: c.ink),
                ),
                Text(
                  '${item is HomeBooking ? l10n.chKindBooking : l10n.chKindBrief} · $sub',
                  style: ShootType.num(ShootType.meta.copyWith(color: c.mute)),
                ),
              ],
            ),
          ),
          Text(l10n.chNext, style: ShootType.meta.copyWith(color: c.mute)),
        ],
      ),
    );
  }
}

class _NextShoot extends StatelessWidget {
  const _NextShoot({required this.next, required this.onOpen});

  final HomeNext next;
  final void Function(String path) onOpen;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    final locale = Localizations.localeOf(context).toString();
    final month = _western(
      DateFormat(
        'MMM',
        locale,
      ).format(DateTime.parse('${next.date}T12:00:00Z')),
    );
    final title = next.emirate.isEmpty
        ? next.occasion
        : next.occasion.isEmpty
        ? next.emirate
        : l10n.chTitleLine(next.occasion, next.emirate);
    final when = [
      _dayAndTime(context, next.date, next.time),
      ?next.length,
    ].join(' · ');
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsetsDirectional.fromSTEB(8, 0, 8, 8),
          child: GroupText(l10n.chNextShoot),
        ),
        Padding(
          padding: const EdgeInsetsDirectional.symmetric(horizontal: 8),
          child: InkWell(
            onTap: () => onOpen('${AppRoutes.accountBookings}/${next.ref}'),
            child: Container(
              constraints: const BoxConstraints(minHeight: 72),
              padding: const EdgeInsetsDirectional.symmetric(vertical: 8),
              decoration: BoxDecoration(
                border: Border.symmetric(horizontal: BorderSide(color: c.hair)),
              ),
              child: Row(
                spacing: 12,
                children: [
                  Container(
                    width: 44,
                    constraints: const BoxConstraints(minHeight: 48),
                    padding: const EdgeInsetsDirectional.symmetric(vertical: 4),
                    decoration: BoxDecoration(
                      color: c.tile,
                      borderRadius: BorderRadius.circular(
                        ShootRadius.photoTile,
                      ),
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          next.date.substring(8, 10),
                          style: ShootType.num(
                            ShootType.heading.copyWith(
                              fontWeight: FontWeight.w700,
                              height: 1,
                              color: c.ink,
                            ),
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          month.toUpperCase(),
                          style: TextStyle(
                            fontSize: 10,
                            height: 1,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 0.6,
                            color: c.tileInk,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      spacing: 2,
                      children: [
                        Text(
                          title,
                          style: ShootType.row.copyWith(
                            fontWeight: FontWeight.w500,
                            color: c.ink,
                          ),
                        ),
                        Text(
                          when,
                          style: ShootType.num(
                            ShootType.meta.copyWith(color: c.mute),
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (next.paid)
                    StatusBadge(label: l10n.chPaid, tone: BadgeTone.success),
                  ShootIcon(ShootIcons.chevron, size: 16, color: c.mute),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _Manage extends StatelessWidget {
  const _Manage({required this.home, required this.live, required this.onOpen});

  final CreatorHome home;
  final bool live;
  final void Function(String path) onOpen;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    final today = switch (home.today) {
      TodayState.free => l10n.chFreeToday,
      TodayState.blocked => l10n.chBusyToday,
      TodayState.booked => l10n.chBookedToday,
    };
    final rows = <Widget>[
      if (live)
        ShootRow(
          leading: const IconTile(ShootIcons.lines),
          label: l10n.chBookings,
          onTap: () => onOpen(AppRoutes.accountBookings),
        ),
      ShootRow(
        leading: const IconTile(ShootIcons.calendar),
        label: l10n.chAvailability,
        trailing: MetaText(today),
        onTap: () => onOpen(AppRoutes.accountAvailability),
        divider: live ? RowDivider.top : RowDivider.none,
      ),
      ShootRow(
        leading: const IconTile(ShootIcons.person),
        label: l10n.chMyProfile,
        onTap: () => onOpen(AppRoutes.accountProfile),
        divider: RowDivider.top,
      ),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsetsDirectional.fromSTEB(8, 0, 8, 8),
          child: GroupText(l10n.chManage),
        ),
        Padding(
          padding: const EdgeInsetsDirectional.symmetric(horizontal: 8),
          child: DecoratedBox(
            decoration: BoxDecoration(
              border: Border.symmetric(horizontal: BorderSide(color: c.hair)),
            ),
            child: Column(children: rows),
          ),
        ),
      ],
    );
  }
}

class _NotLive extends StatelessWidget {
  const _NotLive({required this.home, required this.onOpen});

  final CreatorHome home;
  final void Function(String path) onOpen;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    if (home.mode != HomeMode.incomplete) {
      final review = home.mode == HomeMode.review;
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsetsDirectional.fromSTEB(8, 0, 8, 8),
            child: GroupText(l10n.chYourProfile),
          ),
          ShootPanel(
            padding: const EdgeInsets.all(16),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              spacing: 12,
              children: [
                const IconTile(ShootIcons.camera),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    spacing: 4,
                    children: [
                      Text(
                        review ? l10n.chReviewTitle : l10n.chHiddenTitle,
                        style: ShootType.heading.copyWith(
                          fontSize: 17,
                          color: c.ink,
                        ),
                      ),
                      Text(
                        review ? l10n.chReviewBody : l10n.chHiddenBody,
                        style: ShootType.meta.copyWith(
                          height: 1.5,
                          color: c.mute,
                        ),
                      ),
                      if (!review)
                        InkWell(
                          onTap: () => onOpen(AppRoutes.accountProfile),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            child: Text(
                              l10n.chOpenProfile,
                              style: ShootType.button.copyWith(
                                color: c.ink,
                                decoration: TextDecoration.underline,
                              ),
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
      );
    }
    final missing = home.needs.where((n) => n.required).length;
    final done = profileSteps - missing;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsetsDirectional.fromSTEB(8, 0, 8, 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Flexible(child: GroupText(l10n.chDoThisFirst)),
              Flexible(child: MetaText(l10n.chStepsDone(done, profileSteps))),
            ],
          ),
        ),
        ShootPanel(
          key: const ValueKey('fidelity:card'),
          padding: const EdgeInsetsDirectional.fromSTEB(12, 16, 12, 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 14,
            children: [
              Padding(
                padding: const EdgeInsetsDirectional.symmetric(horizontal: 4),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  spacing: 6,
                  children: [
                    Text(
                      l10n.chNotLiveTitle,
                      style: ShootType.heading.copyWith(color: c.ink),
                    ),
                    Text(
                      l10n.chNotLiveBody,
                      style: ShootType.body.copyWith(
                        fontSize: 14,
                        height: 1.5,
                        color: c.mute,
                      ),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsetsDirectional.symmetric(horizontal: 4),
                child: ProgressBar(
                  value: done / profileSteps,
                  label: l10n.chStepsDone(done, profileSteps),
                ),
              ),
              Padding(
                padding: const EdgeInsetsDirectional.symmetric(horizontal: 4),
                child: Column(
                  children: [
                    for (final (i, need) in home.needs.indexed)
                      Container(
                        constraints: const BoxConstraints(minHeight: 40),
                        decoration: BoxDecoration(
                          border: i == 0
                              ? null
                              : Border(top: BorderSide(color: c.hair)),
                        ),
                        child: Row(
                          spacing: 10,
                          children: [
                            Icon(
                              need.required
                                  ? Icons.circle_outlined
                                  : Icons.check,
                              size: 16,
                              color: need.required ? c.ink : c.mute,
                            ),
                            Expanded(
                              child: Text(
                                _stepLabel(context, need.step),
                                style: ShootType.body.copyWith(
                                  height: 1.3,
                                  color: need.required ? c.ink : c.mute,
                                ),
                              ),
                            ),
                            if (need.required)
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 6,
                                  vertical: 1,
                                ),
                                decoration: BoxDecoration(
                                  color: c.attention,
                                  borderRadius: BorderRadius.circular(5),
                                ),
                                child: Text(
                                  l10n.chMissing,
                                  style: ShootType.meta.copyWith(
                                    color: c.onAttention,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
              TopHit(
                label: l10n.chFinishProfile,
                chevron: true,
                onPressed: () => onOpen(AppRoutes.accountProfile),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// The Decline step as a sheet (boards 07f for a brief): the optional reason, and for a brief the
/// optional note. Closing it records nothing.
class DeclineSheet extends StatefulWidget {
  const DeclineSheet({super.key, required this.item, required this.reasons});

  final HomeItem item;
  final List<DeclineReason> reasons;

  @override
  State<DeclineSheet> createState() => _DeclineSheetState();
}

class _DeclineSheetState extends State<DeclineSheet> {
  final _text = TextEditingController();
  String? _reason;

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    final booking = widget.item is HomeBooking;
    return Padding(
      padding: EdgeInsets.fromLTRB(
        20,
        0,
        20,
        20 + MediaQuery.viewInsetsOf(context).bottom,
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: 12,
          children: [
            Text(
              l10n.chDeclineHeading,
              style: ShootType.heading.copyWith(color: c.ink),
            ),
            if (!booking && widget.reasons.isNotEmpty) ...[
              Text(
                l10n.chReasonLabel,
                style: ShootType.meta.copyWith(
                  color: c.mute,
                  fontWeight: FontWeight.w500,
                ),
              ),
              RadioGroup<String>(
                groupValue: _reason,
                onChanged: (value) => setState(() => _reason = value),
                child: Column(
                  children: [
                    for (final reason in widget.reasons)
                      RadioListTile<String>(
                        value: reason.value,
                        title: Text(
                          reason.label,
                          style: ShootType.body.copyWith(color: c.ink),
                        ),
                        contentPadding: EdgeInsets.zero,
                        dense: true,
                      ),
                  ],
                ),
              ),
            ],
            Text(
              booking ? l10n.chBookingReasonLabel : l10n.chNoteLabel,
              style: ShootType.meta.copyWith(
                color: c.mute,
                fontWeight: FontWeight.w500,
              ),
            ),
            TextField(
              controller: _text,
              maxLength: booking ? 200 : 300,
              minLines: 2,
              maxLines: 4,
            ),
            Row(
              spacing: 8,
              children: [
                Expanded(
                  child: SizedBox(
                    height: ShootSize.topHitHeight,
                    child: SecondaryButton(
                      label: l10n.chConfirmDecline,
                      onPressed: () {
                        final text = _text.text.trim();
                        Navigator.of(context).pop(
                          booking
                              ? DeclineAnswer(
                                  reason: text.isEmpty ? null : text,
                                )
                              : DeclineAnswer(
                                  reason: _reason,
                                  note: text.isEmpty ? null : text,
                                ),
                        );
                      },
                    ),
                  ),
                ),
                Expanded(
                  child: SizedBox(
                    height: ShootSize.topHitHeight,
                    child: SecondaryButton(
                      label: l10n.backAction,
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
