import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/motion/glint.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';

/// `.top`: the screen's one primary action. 50 high, radius 9, the fixed `primary` red with
/// `onPrimary` text in the `action` type (17/600), never the accent.
///
/// The usual board layout is start-aligned (padding 10 12, gap 12): an optional [leading] icon,
/// the label filling the row, an optional [price] and [chevron]. [centered] is the variant on
/// boards 37 and 38: the label alone, centred.
class TopHit extends StatefulWidget {
  const TopHit({
    super.key = const ValueKey('fidelity:topHit'),
    required this.label,
    required this.onPressed,
    this.leading,
    this.price,
    this.chevron = false,
    this.centered = false,
    this.loading = false,
    this.glint = true,
  });

  final String label;

  /// Null disables the action.
  final VoidCallback? onPressed;
  final ShootIcons? leading;

  /// A formatted price (`AED 950`), shown at the end and read with the label.
  final String? price;
  final bool chevron;
  final bool centered;

  /// Shows a progress indicator and ignores taps.
  final bool loading;

  /// The one glint across the button after 2.4 s (`glint: false` turns it off).
  final bool glint;

  @override
  State<TopHit> createState() => _TopHitState();
}

class _TopHitState extends State<TopHit> {
  bool _pressed = false;

  bool get _enabled => widget.onPressed != null && !widget.loading;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final ink = c.onPrimary;
    final text = Text(
      widget.label,
      textAlign: widget.centered ? TextAlign.center : TextAlign.start,
      style: ShootType.action.copyWith(color: ink, height: 1.2),
    );

    final Widget content;
    if (widget.centered && widget.leading == null && widget.price == null) {
      content = Padding(
        padding: const EdgeInsetsDirectional.symmetric(
          horizontal: ShootSpace.s3,
          vertical: 10,
        ),
        child: Center(widthFactor: 1, heightFactor: 1, child: text),
      );
    } else {
      content = Padding(
        padding: const EdgeInsetsDirectional.symmetric(
          horizontal: ShootSpace.s3,
          vertical: 10,
        ),
        child: Row(
          children: [
            if (widget.leading case final icon?) ...[
              ShootIcon(icon, size: 20, strokeWidth: 2, color: ink),
              const SizedBox(width: ShootSpace.s3),
            ],
            Expanded(child: text),
            if (widget.price case final price?) ...[
              const SizedBox(width: ShootSpace.s3),
              Text(
                price,
                style: ShootType.num(
                  ShootType.button.copyWith(fontSize: 15, color: ink),
                ),
              ),
            ],
            if (widget.loading) ...[
              const SizedBox(width: ShootSpace.s3),
              SizedBox.square(
                dimension: 16,
                child: CircularProgressIndicator(strokeWidth: 2, color: ink),
              ),
            ] else if (widget.chevron) ...[
              const SizedBox(width: ShootSpace.s3),
              ShootIcon(
                ShootIcons.chevron,
                size: 16,
                strokeWidth: 2.4,
                color: ink,
              ),
            ],
          ],
        ),
      );
    }

    final fill = !_enabled && !widget.loading
        ? c.primary.withValues(alpha: 0.45)
        : _pressed
        ? c.primaryHover
        : c.primary;

    return Semantics(
      button: true,
      enabled: _enabled,
      label: [widget.label, ?widget.price].join(', '),
      onTap: _enabled ? widget.onPressed : null,
      excludeSemantics: true,
      child: GestureDetector(
        onTapDown: _enabled ? (_) => setState(() => _pressed = true) : null,
        onTapCancel: _enabled ? () => setState(() => _pressed = false) : null,
        onTapUp: _enabled ? (_) => setState(() => _pressed = false) : null,
        onTap: _enabled ? widget.onPressed : null,
        child: AnimatedContainer(
          duration: MediaQuery.disableAnimationsOf(context)
              ? Duration.zero
              : ShootMotion.fast,
          // A minimum, not a height: the label grows with the text size instead of clipping.
          // `.top` is full width; the height grows with the text size instead of clipping.
          width: double.infinity,
          constraints: const BoxConstraints(minHeight: ShootSize.topHitHeight),
          decoration: BoxDecoration(
            color: fill,
            borderRadius: BorderRadius.circular(ShootRadius.row),
          ),
          child: widget.glint && _enabled ? Glint(child: content) : content,
        ),
      ),
    );
  }
}
