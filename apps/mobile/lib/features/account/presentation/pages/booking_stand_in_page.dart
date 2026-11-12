import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/routing/app_routes.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/widgets/shoot_header.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon_button.dart';
import 'package:shoot_mobile/core/widgets/shoot_scaffold.dart';

/// Stands in for the quotation and booking screens (12, 13, 14, 40) of feature 012 at
/// `/account/bookings/{ref}` until they land; 012 replaces the builder passed to `accountRoutes`.
/// It shows no booking data: the reference only.
class BookingStandInPage extends StatelessWidget {
  const BookingStandInPage({super.key, required this.reference});

  final String reference;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    return ShootScaffold(
      child: Column(
        children: [
          ShootHeader(
            leadsWithBack: true,
            leading: ShootIconButton(
              icon: ShootIcons.back,
              label: l10n.backAction,
              onPressed: () => context.go(AppRoutes.accountBookings),
            ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Align(
                alignment: AlignmentDirectional.topStart,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      reference,
                      textDirection: TextDirection.ltr,
                      style: ShootType.title.copyWith(color: c.ink),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      l10n.bookingPageSoon,
                      style: ShootType.body.copyWith(color: c.bodyInk),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
