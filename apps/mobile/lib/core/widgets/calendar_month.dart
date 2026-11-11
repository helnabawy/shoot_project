import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';

/// A day's state on the availability calendar (board 31).
enum DayState { free, blocked, booked }

/// `.grid` / `.cell`: a month of days in 7 columns, gap 2, cells 44 high, radius 9, 16 px tabular.
/// Free days are plain; days off (`.off`) are inverted ink; booked days (`.bk`, fixed) are the
/// selection blue in `accentInk` at 600; today is outlined. The week starts on the locale's first
/// day, and every day is read with its state ([dayLabel], from the screen's strings).
class CalendarMonth extends StatelessWidget {
  const CalendarMonth({
    super.key,
    required this.month,
    required this.stateOf,
    required this.dayLabel,
    required this.today,
    this.onDayTap,
  });

  /// Any day in the month shown.
  final DateTime month;
  final DayState Function(DateTime day) stateOf;

  /// "14 December, booked".
  final String Function(DateTime day, DayState state) dayLabel;
  final DateTime today;

  /// Booked days are fixed and do not take taps.
  final ValueChanged<DateTime>? onDayTap;

  @override
  Widget build(BuildContext context) {
    final first = DateTime(month.year, month.month);
    final days = DateUtils.getDaysInMonth(month.year, month.month);
    final firstWeekday = MaterialLocalizations.of(context)
        .firstDayOfWeekIndex; // 0 = Sunday
    final lead = (first.weekday % 7 - firstWeekday) % 7;
    final cells = <Widget>[
      for (var i = 0; i < lead; i++) const SizedBox.shrink(),
      for (var d = 1; d <= days; d++)
        _cell(context, DateTime(month.year, month.month, d)),
    ];
    return Semantics(
      container: true,
      explicitChildNodes: true,
      child: GridView.count(
        crossAxisCount: 7,
        mainAxisSpacing: 2,
        crossAxisSpacing: 2,
        mainAxisExtent: 44,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        padding: EdgeInsets.zero,
        children: cells,
      ),
    );
  }

  Widget _cell(BuildContext context, DateTime day) {
    final c = context.colors;
    final state = stateOf(day);
    final isToday = DateUtils.isSameDay(day, today);
    final dark = Theme.of(context).brightness == Brightness.dark;
    final (bg, ink, weight) = switch (state) {
      DayState.free => (Colors.transparent, c.ink, FontWeight.w400),
      DayState.blocked => (
        c.ink,
        dark ? c.ground : c.onPrimary,
        FontWeight.w600,
      ),
      DayState.booked => (c.selected, c.accentInk, FontWeight.w600),
    };
    final tap = state == DayState.booked || onDayTap == null
        ? null
        : () => onDayTap!(day);
    return Semantics(
      button: tap != null,
      label: dayLabel(day, state),
      onTap: tap,
      excludeSemantics: true,
      child: GestureDetector(
        onTap: tap,
        child: Container(
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: bg,
            borderRadius: BorderRadius.circular(ShootRadius.row),
            // Today is marked on every state: an outline in the day's own ink.
            border: isToday ? Border.all(color: ink, width: 1.5) : null,
          ),
          child: Text(
            '${day.day}',
            style: ShootType.num(
              ShootType.row.copyWith(color: ink, fontWeight: weight),
            ),
          ),
        ),
      ),
    );
  }
}
