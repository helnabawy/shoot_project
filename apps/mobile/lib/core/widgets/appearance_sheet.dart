import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/theme/accent_cubit.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_accent.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/theme_mode_cubit.dart';

/// Opens the Appearance sheet: the theme and the accent colour, applied on
/// tap, the sheet staying open so the person can compare.
Future<void> showAppearanceSheet(BuildContext context) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    useSafeArea: true,
    constraints: const BoxConstraints(maxWidth: ShootSize.formColumn),
    builder: (_) => const AppearanceSheet(),
  );
}

/// The sheet's content: a Theme group and an Accent colour group in the Brief
/// Bar row grammar (44 px rows, a 30 px leading tile, a trailing check).
class AppearanceSheet extends StatelessWidget {
  const AppearanceSheet({super.key = const Key('appearance-sheet')});

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final mode = context.watch<ThemeModeCubit>().state;
    final accent = context.watch<AccentCubit>().state;
    final themeCubit = context.read<ThemeModeCubit>();
    final accentCubit = context.read<AccentCubit>();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    String themeName(ThemeMode m) => switch (m) {
      ThemeMode.system => l10n.themeSystem,
      ThemeMode.light => l10n.themeLight,
      ThemeMode.dark => l10n.themeDark,
    };
    IconData themeIcon(ThemeMode m) => switch (m) {
      ThemeMode.system => Icons.brightness_auto_outlined,
      ThemeMode.light => Icons.light_mode_outlined,
      ThemeMode.dark => Icons.dark_mode_outlined,
    };
    String accentName(ShootAccent a) => switch (a) {
      ShootAccent.blue => l10n.accentBlue,
      ShootAccent.teal => l10n.accentTeal,
      ShootAccent.violet => l10n.accentViolet,
      ShootAccent.magenta => l10n.accentMagenta,
      ShootAccent.graphite => l10n.accentGraphite,
    };

    return SingleChildScrollView(
      child: Padding(
        // `useSafeArea` guards the top and sides only, so the last row clears
        // the system bar (home indicator, Android navigation bar) here.
        padding: EdgeInsetsDirectional.fromSTEB(
          ShootSpace.s4,
          0,
          ShootSpace.s4,
          ShootSpace.s6 + MediaQuery.viewPaddingOf(context).bottom,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            Semantics(
              header: true,
              child: Text(
                l10n.appearanceTitle,
                style: Theme.of(context).textTheme.titleLarge
                    ?.copyWith(fontWeight: FontWeight.w600),
              ),
            ),
            _GroupLabel(l10n.themeGroupLabel),
            for (final m in ThemeMode.values)
              _OptionRow(
                optionKey: Key('theme-option-${m.name}'),
                name: themeName(m),
                selected: m == mode,
                onTap: () => themeCubit.select(m),
                leading: _OptionTile(icon: themeIcon(m)),
              ),
            _GroupLabel(l10n.accentGroupLabel),
            for (final a in ShootAccent.values)
              _OptionRow(
                optionKey: Key('accent-option-${a.id}'),
                name: accentName(a),
                selected: a == accent,
                onTap: () => accentCubit.select(a),
                leading: _OptionTile(
                  swatch: (isDark ? a.dark : a.light).accent,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _GroupLabel extends StatelessWidget {
  const _GroupLabel(this.label);

  final String label;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      container: true,
      header: true,
      child: Padding(
        padding: const EdgeInsetsDirectional.only(
          top: ShootSpace.s5,
          bottom: ShootSpace.s1,
        ),
        child: Text(
          label,
          style: Theme.of(context).textTheme.labelLarge?.copyWith(
            color: context.colors.mute,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}

/// One radio-style row. The whole row is the tap target; the check is not the
/// only signal of the current choice, the selected fill and the semantics say
/// it too.
class _OptionRow extends StatelessWidget {
  const _OptionRow({
    required this.optionKey,
    required this.name,
    required this.selected,
    required this.onTap,
    required this.leading,
  });

  /// Test hook; sits on the row's semantics node so tests read what a screen
  /// reader reads.
  final Key optionKey;
  final String name;
  final bool selected;
  final VoidCallback onTap;
  final Widget leading;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      key: optionKey,
      container: true,
      excludeSemantics: true,
      label: name,
      checked: selected,
      inMutuallyExclusiveGroup: true,
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 1),
        child: Material(
          color: selected ? c.selected : Colors.transparent,
          borderRadius: BorderRadius.circular(ShootRadius.row),
          child: InkWell(
            borderRadius: BorderRadius.circular(ShootRadius.row),
            hoverColor: c.selectedHover,
            highlightColor: c.selectedHover,
            onTap: onTap,
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: ShootSize.rowHeight),
              child: Padding(
                padding: const EdgeInsetsDirectional.symmetric(
                  horizontal: ShootSpace.s3,
                  vertical: ShootSpace.s2,
                ),
                child: Row(
                  children: [
                    leading,
                    const SizedBox(width: ShootSpace.s3),
                    Expanded(
                      child: Text(
                        name,
                        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: selected ? c.accentInk : c.ink,
                          fontWeight: selected
                              ? FontWeight.w600
                              : FontWeight.w400,
                        ),
                      ),
                    ),
                    SizedBox(
                      width: ShootSpace.s6,
                      child: selected
                          ? Icon(Icons.check, size: 20, color: c.accentInk)
                          : null,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// The 30 px leading tile: an accent's swatch, or a theme's icon on the
/// resting tile.
class _OptionTile extends StatelessWidget {
  const _OptionTile({this.swatch, this.icon});

  final Color? swatch;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return DecoratedBox(
      key: const Key('option-tile'),
      decoration: BoxDecoration(
        color: swatch ?? c.tile,
        borderRadius: BorderRadius.circular(ShootRadius.tile),
        border: swatch == null ? null : Border.all(color: c.hair),
      ),
      child: SizedBox.square(
        dimension: ShootSize.tile,
        child: icon == null ? null : Icon(icon, size: 18, color: c.tileInk),
      ),
    );
  }
}
