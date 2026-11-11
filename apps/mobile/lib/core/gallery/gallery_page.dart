import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shoot_mobile/core/gallery/catalogue.dart';
import 'package:shoot_mobile/core/l10n/app_locales.dart';
import 'package:shoot_mobile/core/l10n/locale_cubit.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/theme/theme_mode_cubit.dart';

/// Debug builds only (`/_gallery`, FR-014): every catalogue component in every state, with
/// placeholder text from [catalogue], and switches for language and theme at the top.
class GalleryPage extends StatelessWidget {
  const GalleryPage({super.key});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Scaffold(
      backgroundColor: c.ground,
      appBar: AppBar(
        title: const Text('Gallery'),
        actions: [
          TextButton(
            onPressed: () {
              final arabic =
                  Localizations.localeOf(context).languageCode == 'ar';
              context.read<LocaleCubit>().select(
                arabic ? AppLocales.english : AppLocales.arabic,
              );
            },
            child: const Text('EN / ع'),
          ),
          IconButton(
            tooltip: 'Theme',
            icon: const Icon(Icons.contrast),
            onPressed: () {
              final dark = Theme.of(context).brightness == Brightness.dark;
              context.read<ThemeModeCubit>().select(
                dark ? ThemeMode.light : ThemeMode.dark,
              );
            },
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsetsDirectional.all(ShootSpace.s5),
        children: [
          for (final entry in catalogue) ...[
            Padding(
              padding: const EdgeInsetsDirectional.only(
                top: ShootSpace.s6,
                bottom: ShootSpace.s2,
              ),
              child: Text(
                entry.name,
                style: ShootType.groupLabel.copyWith(color: c.ink),
              ),
            ),
            for (final MapEntry(key: state, value: build)
                in entry.states.entries) ...[
              Padding(
                padding: const EdgeInsetsDirectional.only(
                  bottom: ShootSpace.s1,
                ),
                child: Text(
                  state,
                  style: ShootType.meta.copyWith(color: c.mute),
                ),
              ),
              build(context),
              const SizedBox(height: ShootSpace.s3),
            ],
          ],
        ],
      ),
    );
  }
}
