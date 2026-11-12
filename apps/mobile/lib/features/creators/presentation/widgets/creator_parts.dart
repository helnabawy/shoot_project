import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/content/creator_card.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/media/image_ref.dart';
import 'package:shoot_mobile/core/routing/app_routes.dart';
import 'package:shoot_mobile/core/routing/error_page.dart';
import 'package:shoot_mobile/core/routing/not_found_page.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_scene.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/widgets/language_action.dart';
import 'package:shoot_mobile/core/widgets/scene_tile.dart';
import 'package:shoot_mobile/core/widgets/shoot_header.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon_button.dart';
import 'package:shoot_mobile/core/widgets/shoot_image.dart';
import 'package:shoot_mobile/core/widgets/wordmark.dart';
import 'package:shoot_mobile/features/creators/presentation/cubit/load_state.dart';
import 'package:shoot_mobile/features/creators/presentation/widgets/glyph.dart';

/// `.hd` of the browsing boards (15, 18, 19): the wordmark, the language action, the account and
/// the menu (the menu screen is feature 010's; until it is built the path shows screen 37).
class BrowseHeader extends StatelessWidget {
  const BrowseHeader({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final ink = context.colors.ink;
    return ShootHeader(
      leading: Wordmark(
        label: l10n.appTitle,
        onTap: () => context.go(AppRoutes.home),
      ),
      trailing: [
        const LanguageAction(),
        ShootIconButton(
          icon: ShootIcons.person,
          label: l10n.mcAccount,
          onPressed: () => context.go(AppRoutes.account),
        ),
        _MenuButton(color: ink, label: l10n.mcOpenMenu),
      ],
    );
  }
}

class _MenuButton extends StatelessWidget {
  const _MenuButton({required this.color, required this.label});

  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: label,
      excludeSemantics: true,
      onTap: () => context.push('/menu'),
      child: GestureDetector(
        onTap: () => context.push('/menu'),
        behavior: HitTestBehavior.opaque,
        child: SizedBox.square(
          dimension: ShootSize.iconButton,
          child: Center(
            child: Glyph(Glyphs.menu, color: color, size: 20, strokeWidth: 2),
          ),
        ),
      ),
    );
  }
}

/// `.hd` of the flow boards (16, 17): back, the wordmark in the middle and one action at the end.
class FlowHeader extends StatelessWidget {
  const FlowHeader({
    super.key,
    required this.backLabel,
    required this.onBack,
    required this.end,
  });

  final String backLabel;
  final VoidCallback onBack;
  final Widget end;

  @override
  Widget build(BuildContext context) {
    return ShootHeader(
      leadsWithBack: true,
      leading: ShootIconButton(
        icon: ShootIcons.back,
        label: backLabel,
        onPressed: onBack,
      ),
      middle: Wordmark(
        label: context.l10n.appTitle,
        onTap: () => context.go(AppRoutes.home),
      ),
      trailing: [end],
    );
  }
}

/// The creator's photo, or the scene tile with a person mark until one is uploaded (never an
/// invented image).
class CreatorAvatar extends StatelessWidget {
  const CreatorAvatar({
    super.key,
    required this.photo,
    this.size = ShootSize.photoTile,
    this.radius = ShootRadius.photoTile,
    this.sceneIndex = 0,
    this.label,
  });

  final ImageRef? photo;
  final double size;
  final double radius;
  final int sceneIndex;

  /// Announced when given ("No photo yet" on the profile); the card's avatar is decorative.
  final String? label;

  @override
  Widget build(BuildContext context) {
    final photo = this.photo;
    final Widget content = photo == null
        ? SceneTile(
            variant: sceneIndex,
            radius: radius,
            child: Center(
              child: ShootIcon(
                ShootIcons.person,
                size: size * .5,
                strokeWidth: 1.8,
                color: context.scene.sceneInk,
              ),
            ),
          )
        : ClipRRect(
            borderRadius: BorderRadius.circular(radius),
            child: ShootImage(
              photo,
              width: size,
              height: size,
              sceneIndex: sceneIndex,
            ),
          );
    final sized = SizedBox.square(dimension: size, child: content);
    if (label == null) return ExcludeSemantics(child: sized);
    return Semantics(
      image: true,
      label: label,
      child: ExcludeSemantics(child: sized),
    );
  }
}

/// `.fact`: a 30 px tile, the value, and its label at the end.
class FactRow extends StatelessWidget {
  const FactRow({
    super.key,
    required this.glyph,
    required this.value,
    required this.label,
  });

  final Glyphs glyph;
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      container: true,
      label: '$label, $value',
      excludeSemantics: true,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 44),
        child: Padding(
          padding: const EdgeInsetsDirectional.symmetric(
            vertical: 7,
            horizontal: 8,
          ),
          child: Row(
            spacing: 12,
            children: [
              Tile30(child: Glyph(glyph, color: c.tileInk)),
              Expanded(
                child: Text(
                  value,
                  style: ShootType.row.copyWith(color: c.ink, height: 1.375),
                ),
              ),
              Text(label, style: ShootType.meta.copyWith(color: c.mute)),
            ],
          ),
        ),
      ),
    );
  }
}

/// `.t30`: the 30 px rounded tile behind a row icon.
class Tile30 extends StatelessWidget {
  const Tile30({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: ShootSize.tile,
      height: ShootSize.tile,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: context.colors.surfaceSunk,
        borderRadius: BorderRadius.circular(ShootRadius.tile),
      ),
      child: child,
    );
  }
}

/// A creator as a list row (18, 19): photo, name, code and emirates, and a chevron. [top] draws
/// the "Top hit" selected wash.
class CreatorRow extends StatelessWidget {
  const CreatorRow({
    super.key,
    required this.creator,
    required this.onTap,
    this.top = false,
    this.divider = true,
    this.sceneIndex = 0,
  });

  final CreatorCard creator;
  final VoidCallback onTap;
  final bool top;
  final bool divider;
  final int sceneIndex;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final meta = [
      creator.displayCode,
      if (creator.places.isNotEmpty) creator.places.join(', '),
    ];
    return Semantics(
      link: true,
      label: context.l10n.mcCardLabel(creator.name),
      onTap: onTap,
      excludeSemantics: true,
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: top ? c.selected : null,
            borderRadius: top ? BorderRadius.circular(ShootRadius.row) : null,
            border: top || !divider
                ? null
                : Border(top: BorderSide(color: c.hair)),
          ),
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 60),
            child: Padding(
              padding: EdgeInsetsDirectional.symmetric(
                vertical: 4,
                horizontal: top ? 8 : 0,
              ),
              child: Row(
                spacing: 12,
                children: [
                  CreatorAvatar(photo: creator.photo, sceneIndex: sceneIndex),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      spacing: 1,
                      children: [
                        Text(
                          creator.name,
                          style: ShootType.row.copyWith(
                            color: c.ink,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        Text(
                          meta.join(' · '),
                          style: ShootType.meta.copyWith(color: c.mute),
                        ),
                      ],
                    ),
                  ),
                  ShootIcon(ShootIcons.chevron, size: 16, color: c.mute),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// A one-request screen's states: a quiet wait, screen 37 for a missing thing and screen 39 for a
/// failure with "Try again". The loaded view is [builder].
class LoadView<T> extends StatelessWidget {
  const LoadView({
    super.key,
    required this.state,
    required this.onRetry,
    required this.builder,
  });

  final LoadState<T> state;
  final VoidCallback onRetry;
  final Widget Function(BuildContext context, T value) builder;

  @override
  Widget build(BuildContext context) {
    return switch (state) {
      LoadDone<T>(:final value) => builder(context, value),
      LoadMissing<T>() => const NotFoundPage(),
      LoadFailed<T>(failure: NotFoundFailure()) => const NotFoundPage(),
      LoadFailed<T>() => ErrorPage(onRetry: onRetry),
      LoadInProgress<T>() => Material(
        color: context.colors.ground,
        child: const Center(child: CircularProgressIndicator.adaptive()),
      ),
    };
  }
}
