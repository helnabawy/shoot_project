import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/content/creator_card.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_scene.dart';
import 'package:shoot_mobile/core/theme/shoot_shadows.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/widgets/scene_tile.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';
import 'package:shoot_mobile/features/creators/presentation/widgets/creator_parts.dart';
import 'package:shoot_mobile/features/creators/presentation/widgets/glyph.dart';

/// Board 15's `.card`: the creator's work tiles, who they are, what they shoot and in which
/// languages, and a foot that opens the profile. The whole card is one link, announced as
/// "{name}, see profile". The cards carry no sample pictures, so the work row shows one scene tile
/// per sample (at most three), and nothing when the creator has none: no invented imagery.
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
    final tiles = creator.sampleCount.clamp(0, 3);
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
                                  child: SceneTile(
                                    variant: SceneTile.variantFor(
                                      position * 3 + i,
                                    ),
                                    radius: ShootRadius.photoLarge,
                                    child: Center(
                                      child: Glyph(
                                        Glyphs.image,
                                        color: context.scene.sceneInk,
                                        size: 22,
                                        strokeWidth: 1.8,
                                      ),
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
