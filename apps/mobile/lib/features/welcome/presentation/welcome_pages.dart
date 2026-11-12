import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/content/creator_card.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/motion/rise.dart';
import 'package:shoot_mobile/core/routing/app_routes.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/widgets/otp_code_input.dart';
import 'package:shoot_mobile/core/widgets/phone_field.dart';
import 'package:shoot_mobile/core/widgets/scene_tile.dart';
import 'package:shoot_mobile/core/widgets/shoot_header.dart';
import 'package:shoot_mobile/core/widgets/shoot_scaffold.dart';
import 'package:shoot_mobile/core/widgets/top_hit.dart';
import 'package:shoot_mobile/core/widgets/wordmark.dart';
import 'package:shoot_mobile/features/brief/domain/brief_draft.dart';
import 'package:shoot_mobile/features/brief/presentation/brief_cubit.dart';
import 'package:shoot_mobile/features/site/domain/entities/brief_builder.dart';
import 'package:shoot_mobile/features/welcome/presentation/welcome_cubit.dart';

/// How long the splash plays at most (spec FR-002).
const splashDuration = Duration(seconds: 2);

/// Screen 01: the aperture opens on the wordmark and the tagline, once, then moves on. Needs no
/// input; with reduced motion it shows its finished frame and moves on at once. Read once as the
/// brand name, the tagline and "Loading"; the aperture is decorative.
class SplashPage extends StatefulWidget {
  const SplashPage({super.key, required this.onDone});

  final VoidCallback onDone;

  @override
  State<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends State<SplashPage> {
  Timer? _timer;
  bool _started = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    final reduced = MediaQuery.disableAnimationsOf(context);
    _timer = Timer(reduced ? Duration.zero : splashDuration, widget.onDone);
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    final reduced = MediaQuery.disableAnimationsOf(context);
    return ShootScaffold(
      child: Semantics(
        container: true,
        liveRegion: true,
        label:
            '${l10n.appTitle}. ${l10n.mlSplashTagline}. ${l10n.mlSplashLoading}',
        excludeSemantics: true,
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TweenAnimationBuilder<double>(
                tween: Tween(begin: reduced ? 1 : 0, end: 1),
                duration: reduced ? Duration.zero : ShootArrive.grow,
                curve: ShootMotion.standard,
                builder: (context, t, _) => CustomPaint(
                  key: const ValueKey('splash:aperture'),
                  size: const Size.square(96),
                  painter: _AperturePainter(t, c.ink, c.primary),
                ),
              ),
              const SizedBox(height: 24),
              Text(
                l10n.appTitle,
                style: ShootType.display.copyWith(
                  fontSize: 46,
                  height: 1,
                  color: c.ink,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                l10n.mlSplashTagline,
                style: ShootType.body.copyWith(color: c.bodyInk),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// A camera aperture: six blades that open to [t] (1 = open), drawn in the wordmark's ink.
class _AperturePainter extends CustomPainter {
  const _AperturePainter(this.t, this.ink, this.accent);

  final double t;
  final Color ink;
  final Color accent;

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final r = size.width / 2;
    final ring = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3
      ..color = ink;
    canvas.drawCircle(center, r - 2, ring);
    final blade = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round
      ..color = ink;
    final inner = r * (0.18 + 0.26 * t);
    for (var i = 0; i < 6; i++) {
      final a = i * 3.14159265 / 3 + (1 - t) * 1.1;
      final from = center + Offset.fromDirection(a, inner);
      final to = center + Offset.fromDirection(a + 1.05, r - 6);
      canvas.drawLine(from, to, blade);
    }
    canvas.drawCircle(center, 4, Paint()..color = accent);
  }

  @override
  bool shouldRepaint(_AperturePainter old) => old.t != t;
}

/// Screens 02 to 04: one learning step. Its text is the CMS's, its demonstration is built from the
/// app's own components and described to a screen reader in one sentence; it does not react to
/// touches. "Skip" and "Start a brief" mark the steps seen.
class LearnStepPage extends StatelessWidget {
  const LearnStepPage({
    super.key,
    required this.step,
    required this.onSkip,
    required this.onNext,
    required this.onBack,
    required this.onStartBrief,
  });

  /// 1 to [welcomeStepCount].
  final int step;
  final VoidCallback onSkip;
  final VoidCallback onNext;
  final VoidCallback onBack;
  final VoidCallback onStartBrief;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    final state = context.watch<WelcomeCubit>().state;
    final last = step == welcomeStepCount;
    final text = state.steps.length >= step ? state.steps[step - 1] : null;
    final rtl = Directionality.of(context) == TextDirection.rtl;
    final demo = switch (step) {
      1 => _DemoBrief(config: state.builder),
      2 => _DemoPrice(creators: state.creators, config: state.builder),
      _ => const _DemoNumber(),
    };
    final demoLabel = switch (step) {
      1 => l10n.mlStepDemoBrief,
      2 => l10n.mlStepDemoPrice,
      _ => l10n.mlStepDemoNumber,
    };
    return GestureDetector(
      behavior: HitTestBehavior.translucent,
      onHorizontalDragEnd: (d) {
        final v = d.primaryVelocity ?? 0;
        if (v.abs() < 200) return;
        // Forward is toward the inline end: a swipe to the start side (left in LTR).
        final forward = rtl ? v > 0 : v < 0;
        if (forward) {
          last ? onStartBrief() : onNext();
        } else {
          onBack();
        }
      },
      child: ShootScaffold(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              flex: 5,
              child: Padding(
                padding: const EdgeInsetsDirectional.fromSTEB(12, 12, 12, 0),
                child: Semantics(
                  container: true,
                  label: demoLabel,
                  excludeSemantics: true,
                  child: ExcludeFocus(child: IgnorePointer(child: demo)),
                ),
              ),
            ),
            ShootHeader(
              leading: Wordmark(label: l10n.appTitle),
              trailing: [
                TextButton(
                  key: const ValueKey('welcome:skip'),
                  onPressed: onSkip,
                  style: TextButton.styleFrom(
                    minimumSize: const Size(44, 44),
                    foregroundColor: c.accentInk,
                    textStyle: ShootType.button,
                  ),
                  child: Text(l10n.mlSkip),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsetsDirectional.fromSTEB(20, 8, 20, 0),
              child: Rise(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l10n.mlStepOf(step, welcomeStepCount),
                      style: ShootType.meta.copyWith(color: c.mute),
                    ),
                    const SizedBox(height: 6),
                    Semantics(
                      header: true,
                      child: Text(
                        text?.title ?? '',
                        style: ShootType.title.copyWith(color: c.ink),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      text?.body ?? '',
                      style: ShootType.body.copyWith(color: c.bodyInk),
                    ),
                  ],
                ),
              ),
            ),
            const Spacer(),
            Padding(
              padding: const EdgeInsetsDirectional.fromSTEB(20, 0, 20, 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Semantics(
                    label: l10n.mlStepSemantics(step, welcomeStepCount),
                    excludeSemantics: true,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        for (var i = 1; i <= welcomeStepCount; i++)
                          AnimatedContainer(
                            duration: MediaQuery.disableAnimationsOf(context)
                                ? Duration.zero
                                : ShootMotion.base,
                            margin: const EdgeInsets.symmetric(horizontal: 3),
                            width: i == step ? 18 : 6,
                            height: 6,
                            decoration: BoxDecoration(
                              color: i == step ? c.accent : c.hair,
                              borderRadius: BorderRadius.circular(3),
                            ),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  TopHit(
                    label: last ? l10n.mlStartBrief : l10n.mlNext,
                    centered: true,
                    onPressed: last ? onStartBrief : onNext,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

Widget _stage(BuildContext context, Widget child) {
  final c = context.colors;
  return Container(
    padding: const EdgeInsets.all(8),
    decoration: BoxDecoration(
      color: c.panel,
      border: Border.all(color: c.hair),
      borderRadius: BorderRadius.circular(ShootRadius.panel),
    ),
    child: child,
  );
}

/// Screen 02's demonstration: the bar with a list of the first options step (the editor's own).
class _DemoBrief extends StatelessWidget {
  const _DemoBrief({required this.config});

  final BriefBuilderConfig? config;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final config = this.config;
    final engine = config == null ? null : BriefEngine(config);
    BuilderSlot? slot;
    for (final s in engine?.slots ?? const <BuilderSlot>[]) {
      if (s.kind == SlotKind.options && s.options.isNotEmpty) {
        slot = s;
        break;
      }
    }
    final options = slot == null
        ? const <BuilderOption>[]
        : engine!.visibleOptions(slot, const BriefDraft()).take(3).toList();
    return Center(
      child: _stage(
        context,
        Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 8, 8, 12),
              child: Text(
                config?.sentence.replaceAllMapped(
                      RegExp(r'\{(\w+)\}'),
                      (m) => engine?.slot(m.group(1)!)?.placeholder ?? '',
                    ) ??
                    '',
                style: ShootType.heading.copyWith(color: c.ink, height: 1.35),
              ),
            ),
            Divider(height: 1, color: c.hair),
            if (slot != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(8, 8, 8, 4),
                child: Text(
                  slot.groupLabel.toUpperCase(),
                  style: ShootType.groupLabel.copyWith(color: c.mute),
                ),
              ),
            for (final (i, o) in options.indexed)
              Container(
                height: ShootSize.rowHeight,
                padding: const EdgeInsets.symmetric(horizontal: 8),
                decoration: BoxDecoration(
                  color: i == 0 ? c.selected : null,
                  borderRadius: BorderRadius.circular(ShootRadius.row),
                ),
                alignment: AlignmentDirectional.centerStart,
                child: Text(
                  o.label,
                  style: ShootType.row.copyWith(color: c.ink),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// Screen 03's demonstration: real listed creators with "Price shown next" where a price would be
/// (the app never invents a price, research R1), and the primary action.
class _DemoPrice extends StatelessWidget {
  const _DemoPrice({required this.creators, required this.config});

  final List<CreatorCard> creators;
  final BriefBuilderConfig? config;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final l10n = context.l10n;
    return Center(
      child: _stage(
        context,
        Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            for (final (i, card) in creators.indexed)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Row(
                  children: [
                    SizedBox(
                      width: 44,
                      height: 44,
                      child: SceneTile(variant: SceneTile.variantFor(i + 1)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            card.name,
                            style: ShootType.row.copyWith(color: c.ink),
                          ),
                          Text(
                            card.types,
                            style: ShootType.meta.copyWith(color: c.mute),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      l10n.mlPriceShownNext,
                      style: ShootType.meta.copyWith(color: c.mute),
                    ),
                  ],
                ),
              ),
            if (config != null)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: TopHit(
                  key: const ValueKey('welcome:demoTopHit'),
                  label: config!.submitLabel,
                  centered: true,
                  glint: false,
                  onPressed: null,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// Screen 04's demonstration: the phone field and the code cells, empty.
class _DemoNumber extends StatelessWidget {
  const _DemoNumber();

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Center(
      child: _stage(
        context,
        Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            PhoneField(
              label: l10n.phoneLabel,
              countryCode: '+971',
              countryCodeLabel: l10n.phoneCountryCodeLabel,
              hint: l10n.phonePlaceholder,
              readOnly: true,
            ),
            const SizedBox(height: 16),
            OtpCodeInput(label: l10n.phoneLabel, onCompleted: (_) {}),
          ],
        ),
      ),
    );
  }
}

/// `/welcome/:step`: 0 is the splash, 1 to 3 the learning steps. A step whose content is not
/// available leaves for the landing without marking the steps seen.
class WelcomeRoute extends StatefulWidget {
  const WelcomeRoute({super.key, required this.step});

  final int step;

  @override
  State<WelcomeRoute> createState() => _WelcomeRouteState();
}

class _WelcomeRouteState extends State<WelcomeRoute> {
  Future<void> _finish({required bool startBrief}) async {
    final router = GoRouter.of(context);
    final brief = context.read<BriefCubit>();
    await context.read<WelcomeCubit>().markSeen();
    if (startBrief) brief.openFirstUnanswered();
    router.go(AppRoutes.home);
  }

  void _go(int step) => context.go('/welcome/$step');

  @override
  Widget build(BuildContext context) {
    final step = widget.step;
    if (step == 0) {
      return SplashPage(onDone: () => _go(1));
    }
    return BlocListener<WelcomeCubit, WelcomeState>(
      listenWhen: (a, b) => b.status == WelcomeStatus.unavailable,
      // Not available this time: straight to the landing, still unseen.
      listener: (context, _) => context.go(AppRoutes.home),
      child: LearnStepPage(
        step: step,
        onSkip: () => unawaited(_finish(startBrief: false)),
        onStartBrief: () => unawaited(_finish(startBrief: true)),
        onNext: () => _go(step + 1),
        onBack: () => step > 1 ? _go(step - 1) : null,
      ),
    );
  }
}
