import 'package:flutter/widgets.dart';
import 'package:shoot_mobile/core/motion/arrive.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';

/// `deal`: a card fades in from 56 px towards the inline end, 600 ms; cards follow each other by
/// [ShootArrive.stagger].
class Deal extends StatelessWidget {
  const Deal({super.key, required this.child, this.index = 0});

  final Widget child;
  final int index;

  @override
  Widget build(BuildContext context) {
    final rtl = Directionality.of(context) == TextDirection.rtl;
    return Arrive(
      duration: ShootArrive.deal,
      delay: ShootArrive.stagger * index,
      child: child,
      builder: (context, t, child) => Opacity(
        opacity: t,
        child: Transform.translate(
          offset: Offset((rtl ? -56 : 56) * (1 - t), 0),
          child: child,
        ),
      ),
    );
  }
}
