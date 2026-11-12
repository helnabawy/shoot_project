import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shoot_mobile/core/motion/shake.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';

/// `.boxes` / `.box`: the one-time code (boards 11, 21, 22). Six equal cells, gap 8, radius 9,
/// `panelSolid`, digits 26/500 tabular.
///
/// - Board 21: each cell is 56 high inside a 1 px `controlBorder` (CSS content-box, so 58 tall);
///   the next cell to fill has a 2 px `focus` border (60 tall) while the field has focus.
/// - Board 22 ([error]): every cell is 56 high including a 2 px `onDanger` border, on `danger`,
///   with `onDanger` digits.
///
/// One real text field underneath carries focus, the number keyboard, paste and the one-time-code
/// autofill (`AutofillHints.oneTimeCode` inside an [AutofillGroup], research R11), so assistive
/// technology meets a single field named [label]. Six digits, typed, pasted or autofilled, call
/// [onCompleted]. Shakes once when [errorCount] grows. Digits stay left to right in Arabic.
class OtpCodeInput extends StatefulWidget {
  const OtpCodeInput({
    super.key,
    required this.label,
    required this.onCompleted,
    this.onChanged,
    this.length = 6,
    this.errorCount = 0,
    this.error = false,
    this.autofocus = false,
    this.controller,
    this.focusNode,
  });

  /// The field's name ("Six-digit code").
  final String label;
  final ValueChanged<String> onCompleted;
  final ValueChanged<String>? onChanged;
  final int length;
  final int errorCount;

  /// The refused state of board 22.
  final bool error;
  final bool autofocus;
  final TextEditingController? controller;
  final FocusNode? focusNode;

  @override
  State<OtpCodeInput> createState() => _OtpCodeInputState();
}

class _OtpCodeInputState extends State<OtpCodeInput> {
  late final TextEditingController _controller =
      widget.controller ?? TextEditingController();
  late final FocusNode _focus = widget.focusNode ?? FocusNode();
  String _last = '';

  @override
  void initState() {
    super.initState();
    _last = _controller.text;
    _controller.addListener(_changed);
    _focus.addListener(_focusChanged);
  }

  void _focusChanged() => setState(() {});

  void _changed() {
    final text = _controller.text;
    setState(() {});
    if (text == _last) return;
    _last = text;
    widget.onChanged?.call(text);
    if (text.length == widget.length) widget.onCompleted(text);
  }

  @override
  void dispose() {
    _controller.removeListener(_changed);
    _focus.removeListener(_focusChanged);
    if (widget.controller == null) _controller.dispose();
    if (widget.focusNode == null) _focus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final code = _controller.text;
    final error = widget.error;
    final active = _focus.hasFocus && !error && code.length < widget.length
        ? code.length
        : -1;

    // Border width per cell; board 21 draws it outside the 56 px (content-box), board 22 inside.
    double border(int i) => error ? 2 : (i == active ? 2 : 1);
    double outerHeight(int i) => error ? 56 : 56 + 2 * border(i);

    final cells = LayoutBuilder(
      builder: (context, constraints) {
        const gap = ShootSpace.s2;
        final borders = error
            ? 0.0
            : [for (var i = 0; i < widget.length; i++) 2 * border(i)]
                  .fold(0.0, (a, b) => a + b);
        final content =
            (constraints.maxWidth - gap * (widget.length - 1) - borders) /
            widget.length;
        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          spacing: gap,
          children: [
            for (var i = 0; i < widget.length; i++)
              Container(
                width: error ? content : content + 2 * border(i),
                height: outerHeight(i),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: error ? c.danger : c.panelSolid,
                  borderRadius: BorderRadius.circular(ShootRadius.row),
                  border: Border.all(
                    color: error
                        ? c.onDanger
                        : i == active
                        ? c.focus
                        : c.controlBorder,
                    width: border(i),
                  ),
                ),
                child: Text(
                  i < code.length ? code[i] : '',
                  style: ShootType.num(
                    TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.w500,
                      color: error ? c.onDanger : c.ink,
                    ),
                  ),
                ),
              ),
          ],
        );
      },
    );

    return Directionality(
      textDirection: TextDirection.ltr,
      child: Shake(
        trigger: widget.errorCount,
        child: AutofillGroup(
          child: Stack(
            children: [
              ExcludeSemantics(child: cells),
              Positioned.fill(
                child: Opacity(
                  opacity: 0,
                  // The hidden field is the one node a screen reader meets.
                  alwaysIncludeSemantics: true,
                  child: TextField(
                    controller: _controller,
                    focusNode: _focus,
                    autofocus: widget.autofocus,
                    keyboardType: TextInputType.number,
                    textInputAction: TextInputAction.done,
                    autofillHints: const [AutofillHints.oneTimeCode],
                    maxLength: widget.length,
                    showCursor: false,
                    enableInteractiveSelection: false,
                    inputFormatters: [
                      FilteringTextInputFormatter.digitsOnly,
                      LengthLimitingTextInputFormatter(widget.length),
                    ],
                    decoration: InputDecoration(
                      counterText: '',
                      border: InputBorder.none,
                      labelText: widget.label,
                      floatingLabelBehavior: FloatingLabelBehavior.never,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
