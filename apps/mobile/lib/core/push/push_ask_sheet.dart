import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/push/push_service.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/widgets/shoot_panel.dart';
import 'package:shoot_mobile/core/widgets/text_link.dart';
import 'package:shoot_mobile/core/widgets/top_hit.dart';

/// Who is being asked, for the one plain sentence of why (US6-S1).
enum PushAskReason { creatorInbox, clientBrief }

/// Shows the reason sheet once per device, then the system prompt on "Allow". Does nothing when
/// push is unavailable, the member is signed out or was already asked.
Future<void> askForPushOnce(
  BuildContext context,
  PushService push,
  PushAskReason reason,
) async {
  if (!push.shouldAsk) return;
  final allow = await showModalBottomSheet<bool>(
    context: context,
    backgroundColor: Colors.transparent,
    builder: (_) => PushAskSheet(reason: reason),
  );
  if (allow ?? false) {
    await push.allow();
  } else {
    await push.decline();
  }
}

class PushAskSheet extends StatelessWidget {
  const PushAskSheet({super.key, required this.reason});

  final PushAskReason reason;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return ShootSheet(
      label: l10n.pushAskTitle,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: 12,
          children: [
            Text(
              l10n.pushAskTitle,
              style: ShootType.heading.copyWith(color: context.colors.ink),
            ),
            Text(
              reason == PushAskReason.creatorInbox
                  ? l10n.pushAskCreator
                  : l10n.pushAskClient,
              style: ShootType.meta.copyWith(color: context.colors.mute),
            ),
            TopHit(
              label: l10n.pushAllow,
              onPressed: () => Navigator.of(context).pop(true),
            ),
            TextLink(
              label: l10n.pushNotNow,
              onTap: () => Navigator.of(context).pop(false),
            ),
          ],
        ),
      ),
    );
  }
}
