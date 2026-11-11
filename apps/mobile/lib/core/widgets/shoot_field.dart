import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';

/// The `.field` box: radius 9, 1 px `controlBorder` (2 px `focus` when focused, `onDanger` with an
/// error), `panelSolid`, 16 px text, padding 0 12.
InputDecoration shootFieldDecoration(
  BuildContext context, {
  String? hint,
  bool error = false,
  EdgeInsetsGeometry padding = const EdgeInsetsDirectional.symmetric(
    horizontal: ShootSpace.s3,
    vertical: 12,
  ),
}) {
  final c = context.colors;
  OutlineInputBorder border(Color color, [double width = 1]) =>
      OutlineInputBorder(
        borderRadius: BorderRadius.circular(ShootRadius.row),
        borderSide: BorderSide(color: color, width: width),
      );
  final edge = error ? c.onDanger : c.controlBorder;
  return InputDecoration(
    isDense: true,
    filled: true,
    fillColor: c.panelSolid,
    hintText: hint,
    hintStyle: ShootType.row.copyWith(color: c.mute),
    contentPadding: padding,
    enabledBorder: border(edge),
    disabledBorder: border(c.hair),
    focusedBorder: border(error ? c.onDanger : c.focus, 2),
    border: border(edge),
  );
}

/// The label above a field (`meta`) and, under it, an error message in `onDanger`, announced.
class FieldFrame extends StatelessWidget {
  const FieldFrame({
    super.key,
    required this.label,
    required this.child,
    this.error,
  });

  final String label;
  final Widget child;
  final String? error;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        ExcludeSemantics(
          child: Padding(
            padding: const EdgeInsetsDirectional.only(bottom: 6),
            child: Text(label, style: ShootType.meta.copyWith(color: c.mute)),
          ),
        ),
        child,
        if (error case final e?)
          Semantics(
            liveRegion: true,
            child: Padding(
              padding: const EdgeInsetsDirectional.only(top: 6),
              child: Text(e, style: ShootType.meta.copyWith(color: c.onDanger)),
            ),
          ),
      ],
    );
  }
}

/// `.field`: a 44 px text field with its label above (read as the field's name) and an optional
/// error below. Text and labels come from the screen (FR-015).
class ShootField extends StatelessWidget {
  const ShootField({
    super.key,
    required this.label,
    this.controller,
    this.hint,
    this.error,
    this.enabled = true,
    this.keyboardType,
    this.textInputAction,
    this.autofillHints,
    this.inputFormatters,
    this.onChanged,
  });

  final String label;
  final TextEditingController? controller;
  final String? hint;
  final String? error;
  final bool enabled;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final Iterable<String>? autofillHints;
  final List<TextInputFormatter>? inputFormatters;
  final ValueChanged<String>? onChanged;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return FieldFrame(
      label: label,
      error: error,
      child: Semantics(
        label: label,
        child: TextField(
          controller: controller,
          enabled: enabled,
          keyboardType: keyboardType,
          textInputAction: textInputAction,
          autofillHints: autofillHints,
          inputFormatters: inputFormatters,
          onChanged: onChanged,
          style: ShootType.row.copyWith(
            color: enabled ? c.ink : c.mute,
            height: 1.25,
          ),
          cursorColor: c.accent,
          decoration: shootFieldDecoration(
            context,
            hint: hint,
            error: error != null,
          ),
        ),
      ),
    );
  }
}

/// `textarea.field`: as [ShootField], at least 92 high, padding 10 12, growing with the text.
class ShootTextArea extends StatelessWidget {
  const ShootTextArea({
    super.key,
    required this.label,
    this.controller,
    this.hint,
    this.error,
    this.onChanged,
  });

  final String label;
  final TextEditingController? controller;
  final String? hint;
  final String? error;
  final ValueChanged<String>? onChanged;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return FieldFrame(
      label: label,
      error: error,
      child: Semantics(
        label: label,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 92),
          child: TextField(
            controller: controller,
            onChanged: onChanged,
            minLines: 3,
            maxLines: null,
            keyboardType: TextInputType.multiline,
            style: ShootType.row.copyWith(color: c.ink, height: 1.375),
            cursorColor: c.accent,
            decoration: shootFieldDecoration(
              context,
              hint: hint,
              error: error != null,
              padding: const EdgeInsetsDirectional.symmetric(
                horizontal: ShootSpace.s3,
                vertical: 10,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
