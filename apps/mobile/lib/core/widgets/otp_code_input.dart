import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shoot_mobile/core/motion/shake.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';

/// `.boxes` / `.box`: the one-time code (boards 11, 21, 22). Six equal cells, gap 8, each 56 high,
/// radius 9, 1 px `controlBorder` (2 px `focus` on the next cell), `panelSolid`, digits 26/500
/// tabular. One real text field underneath carries focus, the keyboard, paste and the one-time-code
/// autofill, so assistive technology meets a single field. Shakes once when [errorCount] grows.
/// Digits stay left to right in Arabic.
class OtpCodeInput extends StatefulWidget {
  const OtpCodeInput({
    super.key,
    required this.label,
    required this.onCompleted,
    this.length = 6,
    this.errorCount = 0,
    this.controller,
  });

  /// The field's name ("6-digit code").
  final String label;
  final ValueChanged<String> onCompleted;
  final int length;
  final int errorCount;
  final TextEditingController? controller;

  @override
  State<OtpCodeInput> createState() => _OtpCodeInputState();
}

class _OtpCodeInputState extends State<OtpCodeInput> {
  late final TextEditingController _controller =
      widget.controller ?? TextEditingController();
  final _focus = FocusNode();

  @override
  void initState() {
    super.initState();
    _controller.addListener(_changed);
    _focus.addListener(() => setState(() {}));
  }

  void _changed() {
    setState(() {});
    if (_controller.text.length == widget.length) {
      widget.onCompleted(_controller.text);
    }
  }

  @override
  void dispose() {
    _controller.removeListener(_changed);
    if (widget.controller == null) _controller.dispose();
    _focus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final code = _controller.text;
    final error = widget.errorCount > 0;
    return Directionality(
      textDirection: TextDirection.ltr,
      child: Shake(
        trigger: widget.errorCount,
        child: Stack(
          children: [
            ExcludeSemantics(
              child: Row(
                spacing: ShootSpace.s2,
                children: [
                  for (var i = 0; i < widget.length; i++)
                    Expanded(
                      child: Container(
                        height: 56,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: c.panelSolid,
                          borderRadius: BorderRadius.circular(ShootRadius.row),
                          border:
                              _focus.hasFocus &&
                                  i == code.length.clamp(0, widget.length - 1)
                              ? Border.all(
                                  color: error ? c.onDanger : c.focus,
                                  width: 2,
                                )
                              : Border.all(
                                  color: error ? c.onDanger : c.controlBorder,
                                ),
                        ),
                        child: Text(
                          i < code.length ? code[i] : '',
                          style: ShootType.num(
                            TextStyle(
                              fontSize: 26,
                              fontWeight: FontWeight.w500,
                              color: c.ink,
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            Positioned.fill(
              child: Opacity(
                opacity: 0,
                child: Semantics(
                  label: widget.label,
                  child: TextField(
                    controller: _controller,
                    focusNode: _focus,
                    autofocus: false,
                    keyboardType: TextInputType.number,
                    autofillHints: const [AutofillHints.oneTimeCode],
                    maxLength: widget.length,
                    showCursor: false,
                    enableInteractiveSelection: false,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                    decoration: const InputDecoration(
                      counterText: '',
                      border: InputBorder.none,
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
