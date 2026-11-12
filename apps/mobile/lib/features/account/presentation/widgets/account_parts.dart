import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/routing/app_routes.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/widgets/language_action.dart';
import 'package:shoot_mobile/core/widgets/money.dart';
import 'package:shoot_mobile/core/widgets/shoot_header.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon_button.dart';
import 'package:shoot_mobile/core/widgets/status_badge.dart';
import 'package:shoot_mobile/core/widgets/wordmark.dart';
import 'package:shoot_mobile/features/account/domain/entities/account.dart';

/// The words and small pieces screens 24, 25 and 26 share. Interface labels come from the ARB
/// files; the data (names, places, prices, statuses as keys) comes from the server.

/// The header of My account and Your bookings: the wordmark, the language action and the account
/// button (current on both screens).
class AccountHeader extends StatelessWidget {
  const AccountHeader({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return ShootHeader(
      leading: Wordmark(
        label: l10n.appTitle,
        onTap: () => context.go(AppRoutes.home),
      ),
      trailing: [
        const LanguageAction(),
        ShootIconButton(
          icon: ShootIcons.person,
          label: l10n.accountButtonLabel,
          onPressed: () => context.go(AppRoutes.account),
        ),
      ],
    );
  }
}

String bookingStatusLabel(BuildContext context, BookingStatus status) {
  final l10n = context.l10n;
  return switch (status) {
    BookingStatus.awaitingAcceptance => l10n.bookingStatusAwaitingAcceptance,
    BookingStatus.waitingProfessional => l10n.bookingStatusWaitingProfessional,
    BookingStatus.awaitingPayment => l10n.bookingStatusAwaitingPayment,
    BookingStatus.paid => l10n.bookingStatusPaid,
    BookingStatus.scheduled => l10n.bookingStatusScheduled,
    BookingStatus.delivered => l10n.bookingStatusDelivered,
    BookingStatus.completed => l10n.bookingStatusCompleted,
    BookingStatus.cancelled => l10n.bookingStatusCancelled,
    BookingStatus.expired => l10n.bookingStatusExpired,
    BookingStatus.onHold => l10n.bookingStatusOnHold,
    BookingStatus.declined => l10n.bookingStatusDeclined,
    BookingStatus.unknown => l10n.bookingStatusUnknown,
  };
}

BadgeTone bookingStatusTone(BookingStatus status) => switch (status) {
  BookingStatus.awaitingAcceptance ||
  BookingStatus.awaitingPayment ||
  BookingStatus.declined => BadgeTone.attention,
  BookingStatus.paid ||
  BookingStatus.scheduled ||
  BookingStatus.delivered ||
  BookingStatus.completed => BadgeTone.success,
  BookingStatus.cancelled || BookingStatus.expired => BadgeTone.danger,
  BookingStatus.waitingProfessional ||
  BookingStatus.onHold ||
  BookingStatus.unknown => BadgeTone.neutral,
};

/// A booking's status as a badge, read as words.
class BookingBadge extends StatelessWidget {
  const BookingBadge(this.status, {super.key});

  final BookingStatus status;

  @override
  Widget build(BuildContext context) => StatusBadge(
    label: bookingStatusLabel(context, status),
    tone: bookingStatusTone(status),
  );
}

String briefStatusLabel(BuildContext context, BriefStatus status) {
  final l10n = context.l10n;
  return switch (status) {
    BriefStatus.newBrief => l10n.briefStatusNew,
    BriefStatus.contacted => l10n.briefStatusContacted,
    BriefStatus.closed => l10n.briefStatusClosed,
  };
}

/// "Sat 14 Dec" in the app's language. The day is a calendar date, never shifted by the zone.
String formatDay(BuildContext context, DateTime day) => DateFormat(
  'EEE d MMM',
  Localizations.localeOf(context).toString(),
).format(DateTime(day.year, day.month, day.day));

String formatSent(BuildContext context, DateTime instant) => DateFormat(
  'd MMM',
  Localizations.localeOf(context).toString(),
).format(instant.toLocal());

/// Keeps [text] (a number) left to right inside Arabic text.
String ltrIsolate(String text) =>
    '${String.fromCharCode(0x2066)}$text${String.fromCharCode(0x2069)}';

/// `+971501234567` as `+971 50 123 4567`, left to right (FR-043).
String formatPhone(String phone) {
  final m = RegExp(r'^\+971(\d{2})(\d{3})(\d{4})$').firstMatch(phone);
  return m == null ? phone : '+971 ${m[1]} ${m[2]} ${m[3]}';
}

/// "Sat 14 Dec, 16:00 · Omar K. · AED 950": what is known of a booking, in the board's order.
String bookingMeta(BuildContext context, BookingSummary b) {
  final when = [
    if (b.date != null) formatDay(context, b.date!),
    ?b.startTime,
  ].join(', ');
  final price = b.totalFils == null ? null : Money.format(b.totalFils! / 100);
  return [if (when.isNotEmpty) when, ?b.professional, ?price].join(' · ');
}

/// The title of a booking row: "Wedding · Dubai".
String bookingTitle(BuildContext context, BookingSummary b) {
  final parts = [?b.occasion, ?b.place];
  return parts.isEmpty ? context.l10n.bookingFallbackTitle : parts.join(' · ');
}

/// `.row` with two lines (a title and a meta line) and an optional trailing widget: the booking
/// and brief rows. At least 44 high; the title ellipsises, the meta line wraps.
class TwoLineRow extends StatelessWidget {
  const TwoLineRow({
    super.key,
    required this.title,
    required this.meta,
    required this.onTap,
    this.leading,
    this.trailing,
    this.semanticLabel,
  });

  final String title;
  final String? meta;
  final VoidCallback? onTap;
  final Widget? leading;
  final Widget? trailing;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      container: true,
      button: onTap != null,
      label: semanticLabel,
      excludeSemantics: semanticLabel != null,
      child: InkWell(
        onTap: onTap,
        child: Container(
          constraints: const BoxConstraints(minHeight: 60),
          padding: const EdgeInsetsDirectional.symmetric(vertical: 8),
          decoration: BoxDecoration(
            border: Border(bottom: BorderSide(color: c.hair)),
          ),
          child: Row(
            children: [
              if (leading case final l?) ...[
                l,
                const SizedBox(width: ShootSpace.s3),
              ],
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: ShootType.row.copyWith(color: c.ink),
                    ),
                    if (meta != null && meta!.isNotEmpty)
                      Text(
                        meta!,
                        style: ShootType.meta.copyWith(color: c.mute),
                      ),
                  ],
                ),
              ),
              if (trailing case final t?) ...[
                const SizedBox(width: ShootSpace.s3),
                t,
              ],
            ],
          ),
        ),
      ),
    );
  }
}
