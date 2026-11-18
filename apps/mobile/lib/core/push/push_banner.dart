import 'dart:async';

import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/auth/safe_next.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/push/push_service.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_shadows.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon_button.dart';

/// A push that arrives while the app is open gets no system banner, so this shows its title and
/// text at the top of the screen: tapping opens its page, the close button or a swipe up dismisses
/// it, and it leaves on its own after [showFor]. A push for the page already open shows nothing
/// (that page reloads instead). The open lists reload either way.
class PushBannerHost extends StatefulWidget {
  const PushBannerHost({
    super.key,
    required this.events,
    required this.open,
    required this.currentPath,
    required this.child,
    this.showFor = const Duration(seconds: 5),
  });

  final Stream<PushEvent> events;
  final void Function(String path) open;
  final String Function() currentPath;
  final Duration showFor;
  final Widget child;

  @override
  State<PushBannerHost> createState() => _PushBannerHostState();
}

class _PushBannerHostState extends State<PushBannerHost> {
  StreamSubscription<PushEvent>? _sub;
  Timer? _timer;
  PushEvent? _shown;
  String? _path;

  @override
  void initState() {
    super.initState();
    _sub = widget.events.listen(_show);
  }

  void _show(PushEvent e) {
    if (e.title.isEmpty && e.body.isEmpty) return;
    final path = safeNext(e.path);
    if (path != null && path == widget.currentPath()) return;
    _timer?.cancel();
    _timer = Timer(widget.showFor, _hide);
    setState(() {
      _shown = e;
      _path = path;
    });
  }

  void _hide() {
    _timer?.cancel();
    if (mounted && _shown != null) setState(() => _shown = null);
  }

  void _tap() {
    final path = _path;
    _hide();
    if (path != null) widget.open(path);
  }

  @override
  void dispose() {
    _timer?.cancel();
    unawaited(_sub?.cancel());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final shown = _shown;
    final reduced = MediaQuery.disableAnimationsOf(context);
    return Stack(
      children: [
        widget.child,
        PositionedDirectional(
          top: 0,
          start: 0,
          end: 0,
          child: SafeArea(
            bottom: false,
            child: AnimatedSwitcher(
              duration: reduced ? Duration.zero : ShootMotion.slow,
              switchInCurve: ShootMotion.standard,
              switchOutCurve: ShootMotion.exit,
              transitionBuilder: (child, animation) => FadeTransition(
                opacity: animation,
                child: SlideTransition(
                  position: Tween(
                    begin: const Offset(0, -0.4),
                    end: Offset.zero,
                  ).animate(animation),
                  child: child,
                ),
              ),
              child: shown == null
                  ? const SizedBox.shrink()
                  : _Banner(
                      key: ObjectKey(shown),
                      event: shown,
                      onTap: _path == null ? null : _tap,
                      onClose: _hide,
                    ),
            ),
          ),
        ),
      ],
    );
  }
}

class _Banner extends StatelessWidget {
  const _Banner({
    super.key,
    required this.event,
    required this.onTap,
    required this.onClose,
  });

  final PushEvent event;
  final VoidCallback? onTap;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final shadows = ShootShadows.of(Theme.of(context).brightness);
    const text = TextStyle(
      leadingDistribution: TextLeadingDistribution.even,
      fontFamilyFallback: ['Noto Sans Arabic'],
    );
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: ShootSize.maxColumn),
        child: Padding(
          padding: const EdgeInsets.all(ShootSpace.s2),
          child: GestureDetector(
            onVerticalDragEnd: (d) {
              if ((d.primaryVelocity ?? 0) < 0) onClose();
            },
            child: Semantics(
              liveRegion: true,
              container: true,
              child: Material(
                type: MaterialType.transparency,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: c.panelSolid,
                    borderRadius: BorderRadius.circular(ShootRadius.panel),
                    border: Border.all(color: c.hair),
                    boxShadow: shadows.panel,
                  ),
                  child: InkWell(
                    key: const Key('push-banner'),
                    onTap: onTap,
                    borderRadius: BorderRadius.circular(ShootRadius.panel),
                    child: Padding(
                      padding: const EdgeInsetsDirectional.only(
                        start: ShootSpace.s4,
                        top: ShootSpace.s3,
                        bottom: ShootSpace.s3,
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              spacing: 2,
                              children: [
                                if (event.title.isNotEmpty)
                                  Text(
                                    event.title,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: text.copyWith(
                                      fontSize: 15,
                                      height: 1.4,
                                      fontWeight: FontWeight.w600,
                                      color: c.ink,
                                    ),
                                  ),
                                if (event.body.isNotEmpty)
                                  Text(
                                    event.body,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: text.copyWith(
                                      fontSize: 14,
                                      height: 1.5,
                                      color: c.mute,
                                    ),
                                  ),
                              ],
                            ),
                          ),
                          ShootIconButton(
                            icon: ShootIcons.close,
                            label: context.l10n.pushBannerDismiss,
                            onPressed: onClose,
                          ),
                        ],
                      ),
                    ),
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
