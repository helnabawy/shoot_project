import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/widgets/choice_chip.dart';
import 'package:shoot_mobile/core/widgets/money.dart';
import 'package:shoot_mobile/core/widgets/shoot_field.dart';
import 'package:shoot_mobile/core/widgets/shoot_panel.dart';
import 'package:shoot_mobile/core/widgets/text_link.dart';
import 'package:shoot_mobile/core/widgets/top_hit.dart';
import 'package:shoot_mobile/features/creator_account/domain/entities/inbox.dart';
import 'package:shoot_mobile/features/creator_account/presentation/widgets/creator_parts.dart';

/// Board 52 (feature 022): the creator's own price for a brief, pre-filled with the client's price
/// (or their current offer), limited to the range. Returns the offer in fils, or `null` when closed.
/// The creator never sees the service fee (FR-012).
Future<int?> showOfferSheet(BuildContext context, {required BriefItem item}) {
  return showModalBottomSheet<int>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => OfferSheet(item: item),
  );
}

class OfferSheet extends StatefulWidget {
  const OfferSheet({super.key, required this.item});

  final BriefItem item;

  @override
  State<OfferSheet> createState() => _OfferSheetState();
}

class _OfferSheetState extends State<OfferSheet> {
  late final TextEditingController _amount;
  String? _error;

  BriefOffer get _offer => widget.item.offer!;

  @override
  void initState() {
    super.initState();
    _amount = TextEditingController(
      text: ((_offer.offerFils ?? _offer.budgetFils) ~/ 100).toString(),
    );
  }

  @override
  void dispose() {
    _amount.dispose();
    super.dispose();
  }

  int? get _fils {
    final aed = int.tryParse(_amount.text.trim());
    return aed == null ? null : aed * 100;
  }

  void _set(int fils) => setState(() {
    _amount.text = (fils ~/ 100).toString();
    _error = null;
  });

  void _send() {
    final fils = _fils;
    if (fils == null || !_offer.allows(fils)) {
      setState(() => _error = context.l10n.inboxOfferOutOfRange);
      return;
    }
    Navigator.of(context).pop(fils);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final offer = _offer;
    final max = offer.maxFils;
    final quick = <int>{
      offer.budgetFils,
      for (final step in [1, 2, 3]) offer.budgetFils + step * 10000,
    }.where(offer.allows).take(4);
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: ShootSheet(
        label: l10n.inboxOfferYourPrice,
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 14,
            children: [
              Text(
                l10n.inboxOfferYourPrice,
                style: ShootType.heading.copyWith(color: context.colors.ink),
              ),
              MetaText(
                l10n.inboxOfferClientPriceIs(
                  Money.format(offer.budgetFils / 100),
                ),
              ),
              ShootField(
                label: 'AED',
                controller: _amount,
                keyboardType: TextInputType.number,
                inputFormatters: [
                  FilteringTextInputFormatter.digitsOnly,
                  LengthLimitingTextInputFormatter(7),
                ],
                error: _error,
                onChanged: (_) => setState(() => _error = null),
              ),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final fils in quick)
                    ShootChip(
                      label: Money.format(fils / 100),
                      on: _fils == fils,
                      onTap: () => _set(fils),
                    ),
                ],
              ),
              MetaText(
                l10n.inboxOfferRange(
                  Money.format(offer.minFils / 100),
                  max == null ? '—' : Money.format(max / 100),
                  offer.revisionsLeft,
                ),
              ),
              TopHit(label: l10n.inboxOfferSend, onPressed: _send),
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
