import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';

/// Gives a block of running text the height a browser gives it (feature 009, the fidelity of
/// screens 20–23).
///
/// Flutter rounds each line box to a whole pixel (15 px at 1.625 is 24, not 24.375; 34 px at 1.25
/// is 43, not 42.5), so a few lines of text drift from the board and push everything below them.
/// This box keeps the glyphs where Flutter draws them but is as tall as the CSS lines (lines ×
/// the exact line height), taken to the nearest device pixel at 2× (half a logical pixel), the
/// grid the browser paints on. The next element then starts where the board puts it.
///
/// [fontSize] and [height] are the text's own (before the text scale, which is applied here).
class CssLineBox extends StatelessWidget {
  const CssLineBox({
    super.key,
    required this.fontSize,
    required this.height,
    required this.child,
  });

  final double fontSize;
  final double height;

  /// A `Text` or `Text.rich` set at [fontSize] / [height].
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final line = MediaQuery.textScalerOf(context).scale(fontSize) * height;
    return _CssLines(line: line, child: child);
  }
}

class _CssLines extends SingleChildRenderObjectWidget {
  const _CssLines({required this.line, super.child});

  final double line;

  @override
  RenderObject createRenderObject(BuildContext context) =>
      _RenderCssLines(line);

  @override
  void updateRenderObject(BuildContext context, _RenderCssLines renderObject) {
    renderObject.line = line;
  }
}

class _RenderCssLines extends RenderProxyBox {
  _RenderCssLines(this._line);

  double _line;
  set line(double value) {
    if (value == _line) return;
    _line = value;
    markNeedsLayout();
  }

  double _height(double childHeight) {
    final rounded = _line.roundToDouble();
    if (rounded <= 0) return childHeight;
    final lines = (childHeight / rounded).round();
    if (lines == 0) return childHeight;
    return (lines * _line * 2).roundToDouble() / 2;
  }

  @override
  void performLayout() {
    final child = this.child;
    if (child == null) {
      size = constraints.smallest;
      return;
    }
    child.layout(constraints, parentUsesSize: true);
    size = constraints.constrain(
      Size(child.size.width, _height(child.size.height)),
    );
  }

  @override
  double computeMinIntrinsicHeight(double width) =>
      _height(super.computeMinIntrinsicHeight(width));

  @override
  double computeMaxIntrinsicHeight(double width) =>
      _height(super.computeMaxIntrinsicHeight(width));
}
