import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';

/// `.ph`: the mobile number. 52 high, radius 9, `panelSolid`; a country-code segment (18 px, a
/// `hair` at its inline end) and the number at 20 px, 0.02em, tabular. Digits stay left to right
/// in Arabic, as on the designer's Arabic boards.
class PhoneField extends StatelessWidget {
  const PhoneField({
    super.key,
    required this.label,
    required this.countryCode,
    required this.countryCodeLabel,
    this.controller,
    this.onCountryTap,
    this.error = false,
    this.onChanged,
  });

  /// The field's name ("Mobile number").
  final String label;

  /// `+971`.
  final String countryCode;

  /// "Country code, United Arab Emirates, +971".
  final String countryCodeLabel;
  final TextEditingController? controller;
  final VoidCallback? onCountryTap;
  final bool error;
  final ValueChanged<String>? onChanged;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Directionality(
      textDirection: TextDirection.ltr,
      child: Container(
        height: 52,
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: c.panelSolid,
          border: Border.all(color: error ? c.onDanger : c.controlBorder),
          borderRadius: BorderRadius.circular(ShootRadius.row),
        ),
        child: Row(
          children: [
            Semantics(
              button: true,
              label: countryCodeLabel,
              onTap: onCountryTap,
              excludeSemantics: true,
              child: InkWell(
                onTap: onCountryTap,
                child: Container(
                  padding: const EdgeInsetsDirectional.symmetric(
                    horizontal: ShootSpace.s3,
                  ),
                  constraints: const BoxConstraints(minWidth: 44),
                  decoration: BoxDecoration(
                    border: BorderDirectional(end: BorderSide(color: c.hair)),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    countryCode,
                    style: ShootType.num(TextStyle(fontSize: 18, color: c.ink)),
                  ),
                ),
              ),
            ),
            Expanded(
              child: Semantics(
                label: label,
                child: TextField(
                  controller: controller,
                  onChanged: onChanged,
                  keyboardType: TextInputType.phone,
                  autofillHints: const [AutofillHints.telephoneNumberNational],
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp(r'[0-9 ]')),
                  ],
                  cursorColor: c.accent,
                  style: ShootType.num(
                    TextStyle(
                      fontSize: 20,
                      letterSpacing: .02 * 20,
                      color: c.ink,
                    ),
                  ),
                  decoration: const InputDecoration(
                    border: InputBorder.none,
                    isDense: true,
                    contentPadding: EdgeInsetsDirectional.symmetric(
                      horizontal: ShootSpace.s3,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
