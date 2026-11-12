import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';

/// `.seg`: equal segments, 40 high, 15 px, in a 1 px `controlBorder` box, radius 9. The chosen
/// segment is `ink` with `ground` text at 500. A radio group for screen readers.
///
/// Labels can come from the CMS (personas), so their length is unknown. When any label would not
/// fit on one line in an equal segment, the options stack as full-width rows of
/// [ShootSize.rowHeight] with a hairline between them, so a word is never broken across lines.
class SegmentedControl<T> extends StatelessWidget {
  const SegmentedControl({
    super.key,
    required this.segments,
    required this.selected,
    required this.onChanged,
  });

  /// Value and label, in order.
  final List<(T, String)> segments;
  final T selected;
  final ValueChanged<T> onChanged;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        border: Border.all(color: c.controlBorder),
        borderRadius: BorderRadius.circular(ShootRadius.row),
      ),
      child: _Segments(
        divider: c.controlBorder,
        children: [
          for (final (value, label) in segments)
            Semantics(
              inMutuallyExclusiveGroup: true,
              checked: value == selected,
              label: label,
              onTap: () => onChanged(value),
              excludeSemantics: true,
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () => onChanged(value),
                child: Container(
                  alignment: Alignment.center,
                  padding: const EdgeInsetsDirectional.symmetric(
                    horizontal: 6,
                    vertical: 8,
                  ),
                  color: value == selected ? c.ink : Colors.transparent,
                  child: Text(
                    label,
                    textAlign: TextAlign.center,
                    style: ShootType.chip.copyWith(
                      color: value == selected ? c.ground : c.ink,
                      fontWeight: value == selected
                          ? FontWeight.w500
                          : FontWeight.w400,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Lays the options out in one row of equal cells when every label fits on one line there, or
/// stacks them otherwise. A render object (not a LayoutBuilder) so parents can ask its intrinsic
/// height, as `SliverFillRemaining` and `IntrinsicHeight` do.
class _Segments extends MultiChildRenderObjectWidget {
  const _Segments({required this.divider, required super.children});

  final Color divider;

  @override
  _RenderSegments createRenderObject(BuildContext context) =>
      _RenderSegments(divider, Directionality.of(context));

  @override
  void updateRenderObject(BuildContext context, _RenderSegments renderObject) {
    renderObject
      ..divider = divider
      ..textDirection = Directionality.of(context);
  }
}

class _SegmentData extends ContainerBoxParentData<RenderBox> {}

class _RenderSegments extends RenderBox
    with
        ContainerRenderObjectMixin<RenderBox, _SegmentData>,
        RenderBoxContainerDefaultsMixin<RenderBox, _SegmentData> {
  _RenderSegments(this._divider, this._textDirection);

  static const double _inlineHeight = 40;
  static const double _hairline = 1;

  /// Slack for the heavier weight of the chosen label, so choosing never flips the layout.
  static const double _weightSlack = 1.05;

  Color _divider;
  set divider(Color value) {
    if (value == _divider) return;
    _divider = value;
    markNeedsPaint();
  }

  TextDirection _textDirection;
  set textDirection(TextDirection value) {
    if (value == _textDirection) return;
    _textDirection = value;
    markNeedsLayout();
  }

  @override
  void setupParentData(RenderBox child) {
    if (child.parentData is! _SegmentData) child.parentData = _SegmentData();
  }

  List<RenderBox> get _children {
    final list = <RenderBox>[];
    var child = firstChild;
    while (child != null) {
      list.add(child);
      child = childAfter(child);
    }
    return list;
  }

  bool _inline(double width) {
    final children = _children;
    if (children.isEmpty || !width.isFinite) return true;
    final cell = width / children.length;
    return children.every(
      (c) => c.getMaxIntrinsicWidth(double.infinity) * _weightSlack <= cell,
    );
  }

  /// The mode and each row's height (one shared height when inline).
  ({bool inline, List<double> heights}) _measure(double width) {
    final children = _children;
    final inline = _inline(width);
    if (inline) {
      final cell = children.isEmpty || !width.isFinite
          ? double.infinity
          : width / children.length;
      final h = children.fold<double>(
        _inlineHeight,
        (m, c) => math.max(m, c.getMinIntrinsicHeight(cell)),
      );
      return (inline: true, heights: [h]);
    }
    return (
      inline: false,
      heights: [
        for (final c in children)
          math.max(ShootSize.rowHeight, c.getMinIntrinsicHeight(width)),
      ],
    );
  }

  double _height(({bool inline, List<double> heights}) m) => m.inline
      ? m.heights.first
      : m.heights.fold<double>(0, (a, b) => a + b) +
            _hairline * (m.heights.length - 1);

  double _naturalWidth() => _children.fold<double>(
    0,
    (sum, c) => sum + c.getMaxIntrinsicWidth(double.infinity),
  );

  @override
  double computeMinIntrinsicWidth(double height) => _children.fold<double>(
    0,
    (m, c) => math.max(m, c.getMinIntrinsicWidth(double.infinity)),
  );

  @override
  double computeMaxIntrinsicWidth(double height) => _naturalWidth();

  @override
  double computeMinIntrinsicHeight(double width) => _height(_measure(width));

  @override
  double computeMaxIntrinsicHeight(double width) => _height(_measure(width));

  double _width(BoxConstraints constraints) => constraints.hasBoundedWidth
      ? constraints.maxWidth
      : constraints.constrainWidth(_naturalWidth());

  @override
  Size computeDryLayout(BoxConstraints constraints) {
    final width = _width(constraints);
    return constraints.constrain(Size(width, _height(_measure(width))));
  }

  @override
  void performLayout() {
    final width = _width(constraints);
    final m = _measure(width);
    final children = _children;
    final rtl = _textDirection == TextDirection.rtl;
    if (m.inline) {
      final cell = children.isEmpty ? 0.0 : width / children.length;
      for (final (i, c) in children.indexed) {
        c.layout(BoxConstraints.tightFor(width: cell, height: m.heights.first));
        (c.parentData! as _SegmentData).offset = Offset(
          rtl ? width - cell * (i + 1) : cell * i,
          0,
        );
      }
    } else {
      var y = 0.0;
      for (final (i, c) in children.indexed) {
        if (i > 0) y += _hairline;
        c.layout(BoxConstraints.tightFor(width: width, height: m.heights[i]));
        (c.parentData! as _SegmentData).offset = Offset(0, y);
        y += m.heights[i];
      }
    }
    size = constraints.constrain(Size(width, _height(m)));
    _stacked = !m.inline;
  }

  bool _stacked = false;

  @override
  void paint(PaintingContext context, Offset offset) {
    defaultPaint(context, offset);
    if (!_stacked) return;
    final paint = Paint()..color = _divider;
    var child = childAfter(firstChild!);
    while (child != null) {
      final y = (child.parentData! as _SegmentData).offset.dy - _hairline;
      context.canvas.drawRect(
        Rect.fromLTWH(offset.dx, offset.dy + y, size.width, _hairline),
        paint,
      );
      child = childAfter(child);
    }
  }

  @override
  bool hitTestChildren(BoxHitTestResult result, {required Offset position}) =>
      defaultHitTestChildren(result, position: position);
}
