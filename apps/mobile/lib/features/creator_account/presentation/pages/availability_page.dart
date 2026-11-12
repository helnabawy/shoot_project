import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/widgets/calendar_month.dart';
import 'package:shoot_mobile/core/widgets/message_banner.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon_button.dart';
import 'package:shoot_mobile/core/widgets/shoot_panel.dart';
import 'package:shoot_mobile/core/widgets/shoot_row.dart';
import 'package:shoot_mobile/core/widgets/text_link.dart';
import 'package:shoot_mobile/features/creator_account/domain/entities/creator_account.dart';
import 'package:shoot_mobile/features/creator_account/presentation/cubit/availability_cubit.dart';
import 'package:shoot_mobile/features/creator_account/presentation/widgets/creator_parts.dart';

/// Screen 31 at `/account/availability`, built to board `S08d-availability`. No primary action:
/// every change saves on its own (FR-035).
class AvailabilityPage extends StatelessWidget {
  const AvailabilityPage({super.key, required this.create});

  final AvailabilityCubit Function() create;

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) {
        final cubit = create();
        unawaited(cubit.load());
        return cubit;
      },
      child: BlocBuilder<AvailabilityCubit, AvailabilityState>(
        builder: (context, state) {
          final cubit = context.read<AvailabilityCubit>();
          return AvailabilityView(
            state: state,
            onRetry: cubit.load,
            onToggle: cubit.toggle,
            onPrevious: cubit.previousMonth,
            onNext: cubit.nextMonth,
            onList: (list) => cubit.showList(list: list),
          );
        },
      ),
    );
  }
}

class AvailabilityView extends StatelessWidget {
  const AvailabilityView({
    super.key,
    required this.state,
    required this.onRetry,
    required this.onToggle,
    required this.onPrevious,
    required this.onNext,
    required this.onList,
  });

  final AvailabilityState state;
  final VoidCallback onRetry;
  final ValueChanged<DateTime> onToggle;
  final VoidCallback onPrevious;
  final VoidCallback onNext;
  final ValueChanged<bool> onList;

  @override
  Widget build(BuildContext context) {
    return switch (state) {
      AvailabilityLoading() => const CreatorLoading(),
      AvailabilityFailed(:final failure) => creatorFailure(failure, onRetry),
      final AvailabilityLoaded s => _Loaded(view: this, state: s),
    };
  }
}

DayState _dayState(Availability a, DateTime day) => switch (a.kindOf(day)) {
  DayKind.blocked => DayState.blocked,
  DayKind.booked => DayState.booked,
  null => DayState.free,
};

String _dayLabel(BuildContext context, DateTime day, DayState state) {
  final l10n = context.l10n;
  final date = formatDay(context, day);
  return switch (state) {
    DayState.free => l10n.caDayFree(date),
    DayState.blocked => l10n.caDayBlocked(date),
    DayState.booked => l10n.caDayBooked(date),
  };
}

class _Loaded extends StatelessWidget {
  const _Loaded({required this.view, required this.state});

  final AvailabilityView view;
  final AvailabilityLoaded state;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final a = state.availability;
    final locale = Localizations.localeOf(context).toString();
    final notice = switch (state.notice) {
      DayNotice.saved => l10n.caSaved,
      DayNotice.booked => l10n.caBookedLocked,
      DayNotice.outside => l10n.caOutsideWindow,
      null => null,
    };
    return CreatorShell(
      child: CreatorBody(
        children: [
          CreatorTitle(l10n.caAvailability, meta: l10n.caAvailabilityIntro),
          Semantics(
            liveRegion: true,
            child: MetaText(l10n.caBlockedCount(a.blockedCount)),
          ),
          if (state.failure != null)
            MessageBanner(text: l10n.caSaveFailed, tone: BannerTone.error)
          else if (notice != null)
            Semantics(
              liveRegion: true,
              child: MetaText(notice, color: context.colors.accentInk),
            ),
          if (state.list)
            _DayList(state: state, onToggle: view.onToggle)
          else
            ShootPanel(
              padding: const EdgeInsets.all(12),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      ShootIconButton(
                        icon: ShootIcons.back,
                        label: l10n.caPreviousMonth,
                        onPressed: state.canGoBack ? view.onPrevious : null,
                      ),
                      Text(
                        DateFormat.yMMMM(locale).format(state.month),
                        style: ShootType.heading.copyWith(
                          color: context.colors.ink,
                        ),
                      ),
                      ShootIconButton(
                        icon: ShootIcons.chevron,
                        label: l10n.caNextMonth,
                        onPressed: state.canGoForward ? view.onNext : null,
                      ),
                    ],
                  ),
                  const _Weekdays(),
                  CalendarMonth(
                    month: state.month,
                    today: a.today,
                    stateOf: (day) =>
                        a.inWindow(day) ? _dayState(a, day) : DayState.free,
                    dayLabel: (day, s) => _dayLabel(context, day, s),
                    onDayTap: view.onToggle,
                  ),
                ],
              ),
            ),
          const _Legend(),
          TextLink(
            label: state.list ? l10n.caSeeCalendar : l10n.caSeeList,
            onTap: () => view.onList(!state.list),
          ),
        ],
      ),
    );
  }
}

class _Weekdays extends StatelessWidget {
  const _Weekdays();

  @override
  Widget build(BuildContext context) {
    final locale = Localizations.localeOf(context).toString();
    final first = MaterialLocalizations.of(context).firstDayOfWeekIndex;
    // 2026-11-01 is a Sunday.
    final names = [
      for (var i = 0; i < 7; i++)
        DateFormat.E(locale).format(DateTime(2026, 11, 1 + (first + i) % 7)),
    ];
    return ExcludeSemantics(
      child: Row(
        children: [
          for (final n in names) Expanded(child: Center(child: MetaText(n))),
        ],
      ),
    );
  }
}

class _Legend extends StatelessWidget {
  const _Legend();

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    Widget item(Color? fill, Color border, String text) => Row(
      mainAxisSize: MainAxisSize.min,
      spacing: 6,
      children: [
        Container(
          width: 14,
          height: 14,
          decoration: BoxDecoration(
            color: fill,
            border: Border.all(color: border),
            borderRadius: BorderRadius.circular(4),
          ),
        ),
        MetaText(text),
      ],
    );
    return Wrap(
      spacing: 16,
      runSpacing: 8,
      children: [
        item(null, c.controlBorder, l10n.caLegendFree),
        item(c.ink, c.ink, l10n.caLegendBlocked),
        item(c.selected, c.accentInk, l10n.caLegendBooked),
      ],
    );
  }
}

/// "See every day as a list": the same 90 days, with the same tap.
class _DayList extends StatelessWidget {
  const _DayList({required this.state, required this.onToggle});

  final AvailabilityLoaded state;
  final ValueChanged<DateTime> onToggle;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final a = state.availability;
    return ShootPanel(
      padding: const EdgeInsetsDirectional.symmetric(horizontal: 12),
      child: Column(
        children: [
          for (final (i, day) in state.window.indexed)
            ShootRow(
              label: formatDay(context, day),
              chevron: false,
              link: false,
              divider: i == 0 ? RowDivider.none : RowDivider.top,
              trailing: MetaText(switch (_dayState(a, day)) {
                DayState.free => l10n.caLegendFree,
                DayState.blocked => l10n.caLegendBlocked,
                DayState.booked => l10n.caLegendBooked,
              }),
              onTap: () => onToggle(day),
            ),
        ],
      ),
    );
  }
}
