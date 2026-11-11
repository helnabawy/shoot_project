import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';

/// Where a row draws its hairline.
enum RowDivider { none, top, topAndBottom }

/// `.row`: a tappable result row. The usual board row is min-height 48, padding 4 0, gap 12, the
/// `row` type (16/1.3), a leading tile and a trailing chevron in `mute` that mirrors in Arabic.
/// Boards that draw a denser row (37: min 44, 15 px, hairlines) pass those values.
class ShootRow extends StatelessWidget {
  const ShootRow({
    super.key,
    required this.label,
    required this.onTap,
    this.leading,
    this.trailing,
    this.chevron = true,
    this.minHeight = 48,
    this.padding = const EdgeInsetsDirectional.symmetric(vertical: 4),
    this.labelStyle,
    this.divider = RowDivider.none,
    this.selected = false,
    this.link = true,
  });

  final String label;
  final VoidCallback? onTap;
  final Widget? leading;

  /// A value shown at the end instead of (or before) the chevron.
  final Widget? trailing;
  final bool chevron;
  final double minHeight;
  final EdgeInsetsDirectional padding;

  /// Defaults to [ShootType.row].
  final TextStyle? labelStyle;
  final RowDivider divider;

  /// The current choice: a `selected` wash and an `accentInk` label.
  final bool selected;

  /// Announced as a link (it navigates) rather than a button.
  final bool link;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final hair = BorderSide(color: c.hair);
    final style = (labelStyle ?? ShootType.row).copyWith(
      color: selected ? c.accentInk : c.ink,
    );
    return Semantics(
      link: link,
      button: !link,
      selected: selected,
      label: label,
      onTap: onTap,
      excludeSemantics: true,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: selected ? c.selected : null,
          border: Border(
            top: divider == RowDivider.none ? BorderSide.none : hair,
            bottom: divider == RowDivider.topAndBottom ? hair : BorderSide.none,
          ),
        ),
        child: Material(
          type: MaterialType.transparency,
          child: InkWell(
            onTap: onTap,
            highlightColor: c.selectedHover,
            child: Padding(
              // The hairlines sit outside the row's min-height, as with CSS borders.
              padding: EdgeInsetsDirectional.only(
                top: divider == RowDivider.none ? 0 : 1,
                bottom: divider == RowDivider.topAndBottom ? 1 : 0,
              ),
              child: ConstrainedBox(
                constraints: BoxConstraints(minHeight: minHeight),
                child: Padding(
                  padding: padding,
                  child: Row(
                    children: [
                      if (leading case final l?) ...[
                        l,
                        const SizedBox(width: ShootSpace.s3),
                      ],
                      Expanded(child: Text(label, style: style)),
                      if (trailing case final t?) ...[
                        const SizedBox(width: ShootSpace.s3),
                        t,
                      ],
                      if (chevron) ...[
                        const SizedBox(width: ShootSpace.s3),
                        ShootIcon(ShootIcons.chevron, size: 16, color: c.mute),
                      ],
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
