import 'package:flutter/widgets.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';

/// `.hd`: the 58 px screen header. Padding is 20 at the inline start (12 when it leads with a back
/// button) and 12 at the end; [leading] and [trailing] sit at either end.
class ShootHeader extends StatelessWidget {
  const ShootHeader({
    super.key = const ValueKey('fidelity:header'),
    required this.leading,
    this.trailing = const [],
    this.leadsWithBack = false,
  });

  /// The wordmark, or a back button followed by a title.
  final Widget leading;

  /// Icon buttons and the language action, in order.
  final List<Widget> trailing;

  /// When [leading] starts with a 44 px back button, the start padding is 12.
  final bool leadsWithBack;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: ShootSize.header,
      child: Padding(
        padding: EdgeInsetsDirectional.only(
          start: leadsWithBack ? ShootSpace.s3 : ShootSpace.s5,
          end: ShootSpace.s3,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            leading,
            Row(mainAxisSize: MainAxisSize.min, children: trailing),
          ],
        ),
      ),
    );
  }
}
