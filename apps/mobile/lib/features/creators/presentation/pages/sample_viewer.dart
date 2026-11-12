import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';
import 'package:shoot_mobile/core/widgets/shoot_image.dart';
import 'package:shoot_mobile/features/creators/domain/entities/creators.dart';
import 'package:shoot_mobile/features/creators/presentation/widgets/glyph.dart';

/// The full-screen sample viewer (no board; checked against the app's own baseline): swipe through
/// the samples, each with its caption and description for screen readers. A video sample shows a
/// play mark and "Play video" opens its link outside the app (MC-US1-S4).
class SampleViewer extends StatefulWidget {
  const SampleViewer({
    super.key,
    required this.samples,
    required this.initial,
    required this.onPlay,
  });

  final List<Sample> samples;
  final int initial;
  final void Function(Uri url) onPlay;

  @override
  State<SampleViewer> createState() => _SampleViewerState();
}

class _SampleViewerState extends State<SampleViewer> {
  late final PageController _controller = PageController(
    initialPage: widget.initial,
  );
  late int _index = widget.initial;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    const ink = Color(0xFFF5F5F7);
    final total = widget.samples.length;
    final current = widget.samples[_index];
    return Scaffold(
      backgroundColor: const Color(0xFF111112),
      body: SafeArea(
        child: Column(
          children: [
            Row(
              children: [
                Semantics(
                  button: true,
                  label: l10n.mcViewerClose,
                  excludeSemantics: true,
                  onTap: () => Navigator.of(context).pop(),
                  child: GestureDetector(
                    onTap: () => Navigator.of(context).pop(),
                    behavior: HitTestBehavior.opaque,
                    child: const SizedBox.square(
                      dimension: 48,
                      child: Center(
                        child: Glyph(
                          Glyphs.close,
                          color: ink,
                          size: 20,
                          strokeWidth: 2,
                        ),
                      ),
                    ),
                  ),
                ),
                const Spacer(),
                Padding(
                  padding: const EdgeInsetsDirectional.only(end: 16),
                  child: Text(
                    '${_index + 1} / $total',
                    style: ShootType.meta.copyWith(color: ink),
                  ),
                ),
              ],
            ),
            Expanded(
              child: PageView.builder(
                controller: _controller,
                itemCount: total,
                onPageChanged: (i) => setState(() => _index = i),
                itemBuilder: (context, i) {
                  final sample = widget.samples[i];
                  final video = sample.kind == SampleKind.video;
                  return Semantics(
                    image: true,
                    label: [
                      sample.alt,
                      if (sample.caption.isNotEmpty) sample.caption,
                    ].where((s) => s.isNotEmpty).join('. '),
                    child: ExcludeSemantics(
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          Positioned.fill(
                            child: ShootImage(
                              sample.large,
                              fit: BoxFit.contain,
                              sceneIndex: i,
                            ),
                          ),
                          if (video) const _PlayMark(size: 64),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                spacing: 12,
                children: [
                  if (current.caption.isNotEmpty)
                    Text(
                      current.caption,
                      textAlign: TextAlign.center,
                      style: ShootType.body.copyWith(color: ink),
                    ),
                  if (current.kind == SampleKind.video &&
                      current.videoUrl != null)
                    Center(
                      child: TextButton.icon(
                        onPressed: () =>
                            widget.onPlay(Uri.parse(current.videoUrl!)),
                        icon: const ShootIcon(
                          ShootIcons.play,
                          color: ink,
                          size: 18,
                        ),
                        label: Text(
                          l10n.mcPlayVideo,
                          style: ShootType.button.copyWith(color: ink),
                        ),
                      ),
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

/// `.play`: the dark disc with a play triangle on a video sample.
class PlayMark extends StatelessWidget {
  const PlayMark({super.key, this.size = 36});

  final double size;

  @override
  Widget build(BuildContext context) => _PlayMark(size: size);
}

class _PlayMark extends StatelessWidget {
  const _PlayMark({required this.size});

  final double size;

  @override
  Widget build(BuildContext context) {
    return ExcludeSemantics(
      child: Container(
        width: size,
        height: size,
        alignment: Alignment.center,
        decoration: const BoxDecoration(
          shape: BoxShape.circle,
          color: Color(0xB81D1D1F),
        ),
        child: ShootIcon(
          ShootIcons.play,
          size: size * .4,
          color: const Color(0xFFFFFFFF),
        ),
      ),
    );
  }
}
