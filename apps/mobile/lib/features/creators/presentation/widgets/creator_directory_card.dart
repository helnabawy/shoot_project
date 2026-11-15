import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/content/creator_card.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/media/image_ref.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_scene.dart';
import 'package:shoot_mobile/core/theme/shoot_shadows.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/widgets/scene_tile.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';
import 'package:shoot_mobile/core/widgets/shoot_image.dart';
import 'package:shoot_mobile/features/creators/presentation/widgets/creator_parts.dart';
import 'package:shoot_mobile/features/creators/presentation/widgets/glyph.dart';

/// Board 15's `.card`: the creator's work tiles, who they are, what they shoot and in which
/// languages, and a foot that opens the profile. The whole card is one link, announced as
/// "{name}, see profile". The work row shows the pictures of the creator's first samples (at most
/// three, 011 FR-034); a sample the answer has no picture of, and a picture still loading or that
/// failed, shows the scene tile; a creator with no samples has no row: no invented imagery.
/// The starting price slot stays empty until the API carries one (research R1).
class CreatorDirectoryCard extends StatelessWidget {
  const CreatorDirectoryCard({
    super.key,
    required this.creator,
    required this.onTap,
    this.position = 0,
  });

  final CreatorCard creator;
  final VoidCallback onTap;

  /// The card's place in the list; varies the scene tiles' light.
  final int position;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final l10n = context.l10n;
    final previews = creator.samplePreviews;
    final tiles = math.max(creator.sampleCount, previews.length).clamp(0, 3);
    final metaLine = [
      creator.displayCode,
      if (creator.places.isNotEmpty) creator.places.join(', '),
      if (creator.yearsExperience case final years?) l10n.mcYears(years),
    ].join(' · ');
    return Semantics(
      link: true,
      label: l10n.mcCardLabel(creator.name),
      onTap: onTap,
      excludeSemantics: true,
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: c.panelSolid,
            border: Border.all(color: c.hair),
            borderRadius: BorderRadius.circular(ShootRadius.panel),
            boxShadow: ShootShadows.of(Theme.of(context).brightness).lift,
          ),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: 12,
              children: [
                if (tiles > 0)
                  Row(
                    spacing: 8,
                    children: [
                      for (var i = 0; i < 3; i++)
                        Expanded(
                          child: i < tiles
                              ? AspectRatio(
                                  aspectRatio: 1,
                                  child: _WorkTile(
                                    picture: i < previews.length
                                        ? previews[i]
                                        : null,
                                    variant: SceneTile.variantFor(
                                      position * 3 + i,
                                    ),
                                  ),
                                )
                              : const SizedBox.shrink(),
                        ),
                    ],
                  ),
                Row(
                  spacing: 12,
                  children: [
                    CreatorAvatar(photo: creator.photo, sceneIndex: position),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            creator.name,
                            style: ShootType.action.copyWith(
                              color: c.ink,
                              height: 1.3,
                            ),
                          ),
                          Text(
                            metaLine,
                            style: ShootType.meta.copyWith(color: c.mute),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  spacing: 2,
                  children: [
                    if (creator.specialties.isNotEmpty)
                      Text(
                        creator.specialties.join(' · '),
                        style: ShootType.body.copyWith(
                          color: c.ink,
                          height: 1.5,
                        ),
                      ),
                    if (creator.languages.isNotEmpty)
                      Text(
                        l10n.mcSpeaks(
                          creator.languages.join(l10n.listSeparator),
                        ),
                        style: ShootType.meta.copyWith(color: c.mute),
                      ),
                  ],
                ),
                DecoratedBox(
                  decoration: BoxDecoration(
                    border: Border(top: BorderSide(color: c.hair)),
                  ),
                  child: Padding(
                    padding: const EdgeInsetsDirectional.only(top: 12),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      spacing: 4,
                      children: [
                        Text(
                          l10n.mcCardProfile,
                          style: ShootType.body.copyWith(
                            color: c.accentInk,
                            fontWeight: FontWeight.w500,
                            height: 1.2,
                          ),
                        ),
                        ShootIcon(
                          ShootIcons.chevron,
                          size: 16,
                          strokeWidth: 2.4,
                          color: c.accentInk,
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// One square of the work row: the sample's picture, or the designed tile with its image mark
/// when there is none, while it loads and when the load fails.
class _WorkTile extends StatelessWidget {
  const _WorkTile({required this.picture, required this.variant});

  final ImageRef? picture;
  final int variant;

  @override
  Widget build(BuildContext context) {
    final picture = this.picture;
    final tile = SceneTile(
      key: picture == null ? const ValueKey('card-sample-tile') : null,
      variant: variant,
      radius: ShootRadius.photoLarge,
      child: Center(
        child: Glyph(
          Glyphs.image,
          color: context.scene.sceneInk,
          size: 22,
          strokeWidth: 1.8,
        ),
      ),
    );
    if (picture == null) return tile;
    // The tile is painted as it always was and the picture covers it once loaded: clipping the
    // tile itself would redraw its edges and move the screen off its board.
    return Stack(
      fit: StackFit.expand,
      children: [
        tile,
        ClipRRect(
          borderRadius: BorderRadius.circular(ShootRadius.photoLarge),
          child: ShootImage(
            picture,
            key: const ValueKey('card-sample-picture'),
            placeholder: const SizedBox.expand(),
          ),
        ),
      ],
    );
  }
}
