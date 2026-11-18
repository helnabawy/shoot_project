import 'dart:async';

import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/contact/booking_contact.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/web/website_links.dart';
import 'package:shoot_mobile/core/widgets/secondary_button.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';

/// Feature 025: how to reach the other side of a paid booking. Who it is, their number (left
/// to right in both languages), and two secondary actions: Call and WhatsApp. Never the screen's
/// primary action.
class ContactBlock extends StatelessWidget {
  const ContactBlock({
    super.key,
    required this.contact,
    this.openUrl = openInBrowser,
  });

  final BookingContact contact;
  final UrlOpener openUrl;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    final who = contact.name.isEmpty
        ? l10n.contactClientTitle
        : l10n.contactTitle(contact.name);
    return Semantics(
      container: true,
      label: who,
      child: Column(
        key: ValueKey('contact:${contact.phone}'),
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 8,
        children: [
          Row(
            spacing: 12,
            children: [
              Expanded(
                child: Text(
                  [who, if (contact.role.isNotEmpty) contact.role].join(' · '),
                  style: ShootType.row.copyWith(
                    color: c.ink,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              Text(
                contact.display,
                textDirection: TextDirection.ltr,
                style: ShootType.num(ShootType.meta.copyWith(color: c.mute)),
              ),
            ],
          ),
          Row(
            spacing: 8,
            children: [
              Expanded(
                child: SecondaryButton(
                  key: const ValueKey('contact:call'),
                  label: l10n.contactCall,
                  icon: ShootIcons.phone,
                  onPressed: () => unawaited(openUrl(contact.callUri)),
                ),
              ),
              Expanded(
                child: SecondaryButton(
                  key: const ValueKey('contact:whatsapp'),
                  label: l10n.contactWhatsapp,
                  icon: ShootIcons.whatsapp,
                  onPressed: () =>
                      unawaited(openUrl(Uri.parse(contact.whatsappUrl))),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
