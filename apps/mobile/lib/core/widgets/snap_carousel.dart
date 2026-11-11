import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';

/// `.rail` and `.dots`: cards that snap to the centre, gap 12, with dots below (6 px, gap 6; the
/// current dot widens to 18). Announces "n of m" through [positionLabel] when the page changes, and
/// is adjustable for screen readers.
class SnapCarousel extends StatefulWidget {
  const SnapCarousel({
    super.key,
    required this.children,
    required this.positionLabel,
    required this.height,
    this.onChanged,
    this.initialIndex = 0,
  });

  final List<Widget> children;

  /// The cards' height: a page view cannot size itself to its children.
  final double height;

  /// "2 of 5" in the current language (from the ARB), for index n (0-based) of m.
  final String Function(int n, int m) positionLabel;
  final ValueChanged<int>? onChanged;
  final int initialIndex;

  @override
  State<SnapCarousel> createState() => _SnapCarouselState();
}

class _SnapCarouselState extends State<SnapCarousel> {
  late final PageController _controller = PageController(
    viewportFraction: ShootSize.carouselRatio + 12 / 360,
    initialPage: widget.initialIndex,
  );
  late int _index = widget.initialIndex;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _go(int index) {
    final reduced = MediaQuery.disableAnimationsOf(context);
    if (reduced) {
      _controller.jumpToPage(index);
    } else {
      unawaited(
        _controller.animateToPage(
          index,
          duration: ShootMotion.slow,
          curve: ShootMotion.standard,
        ),
      );
    }
  }

  void _changed(int index) {
    setState(() => _index = index);
    widget.onChanged?.call(index);
    unawaited(
      SemanticsService.sendAnnouncement(
        View.of(context),
        widget.positionLabel(index, widget.children.length),
        Directionality.of(context),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final count = widget.children.length;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Semantics(
          value: widget.positionLabel(_index, count),
          increasedValue: _index < count - 1
              ? widget.positionLabel(_index + 1, count)
              : null,
          decreasedValue: _index > 0
              ? widget.positionLabel(_index - 1, count)
              : null,
          onIncrease: _index < count - 1 ? () => _go(_index + 1) : null,
          onDecrease: _index > 0 ? () => _go(_index - 1) : null,
          child: Padding(
            padding: const EdgeInsetsDirectional.only(top: 4, bottom: 8),
            child: SizedBox(
              height: widget.height,
              child: PageView(
                controller: _controller,
                onPageChanged: _changed,
                padEnds: true,
                children: [
                  for (final child in widget.children)
                    Padding(
                      padding: const EdgeInsetsDirectional.symmetric(
                        horizontal: 6,
                      ),
                      child: child,
                    ),
                ],
              ),
            ),
          ),
        ),
        ExcludeSemantics(
          child: SizedBox(
            height: 24,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              spacing: 6,
              children: [
                for (var i = 0; i < count; i++)
                  AnimatedContainer(
                    duration: MediaQuery.disableAnimationsOf(context)
                        ? Duration.zero
                        : ShootMotion.base,
                    width: i == _index ? 18 : 6,
                    height: 6,
                    decoration: BoxDecoration(
                      color: c.ink.withValues(alpha: i == _index ? 1 : .2),
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
