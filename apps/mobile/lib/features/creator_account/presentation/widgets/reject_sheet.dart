import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/widgets/choice_chip.dart';
import 'package:shoot_mobile/core/widgets/shoot_field.dart';
import 'package:shoot_mobile/core/widgets/shoot_panel.dart';
import 'package:shoot_mobile/core/widgets/text_link.dart';
import 'package:shoot_mobile/core/widgets/top_hit.dart';
import 'package:shoot_mobile/features/creator_account/domain/entities/inbox.dart';
import 'package:shoot_mobile/features/creator_account/presentation/widgets/creator_parts.dart';

/// What the creator chose in the "Not for me" sheet; both parts are optional.
final class RejectAnswer {
  const RejectAnswer({this.reason, this.note});

  final String? reason;
  final String? note;
}

/// Board `S07f-inbox-reject`: an optional reason from the content list and an optional note.
/// `null` when closed without sending.
Future<RejectAnswer?> showRejectSheet(
  BuildContext context, {
  required BriefItem item,
  required List<RejectReason> reasons,
}) {
  return showModalBottomSheet<RejectAnswer>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => RejectSheet(item: item, reasons: reasons),
  );
}

class RejectSheet extends StatefulWidget {
  const RejectSheet({super.key, required this.item, required this.reasons});

  final BriefItem item;
  final List<RejectReason> reasons;

  @override
  State<RejectSheet> createState() => _RejectSheetState();
}

class _RejectSheetState extends State<RejectSheet> {
  final _note = TextEditingController();
  String? _reason;

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final item = widget.item;
    final when = item.date == null
        ? l10n.inboxAnyDate
        : formatDay(context, item.date!);
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: ShootSheet(
        label: l10n.inboxRejectTitle,
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 14,
            children: [
              Text(
                l10n.inboxRejectTitle,
                style: ShootType.heading.copyWith(color: context.colors.ink),
              ),
              MetaText('${item.occasion} · $when. ${l10n.inboxRejectBody}'),
              if (widget.reasons.isNotEmpty) ...[
                GroupText(l10n.inboxReasonLabel),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final r in widget.reasons)
                      ShootChip(
                        label: r.label,
                        on: _reason == r.value,
                        onTap: () => setState(
                          () => _reason = _reason == r.value ? null : r.value,
                        ),
                      ),
                  ],
                ),
              ],
              ShootField(label: l10n.inboxNoteLabel, controller: _note),
              TopHit(
                label: l10n.inboxReject,
                onPressed: () => Navigator.of(context).pop(
                  RejectAnswer(
                    reason: _reason,
                    note: _note.text.trim().isEmpty ? null : _note.text.trim(),
                  ),
                ),
              ),
              TextLink(
                label: l10n.caCancel,
                onTap: () => Navigator.of(context).pop(),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
