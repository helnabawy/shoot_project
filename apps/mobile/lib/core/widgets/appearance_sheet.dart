import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/theme/accent_cubit.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_accent.dart';
import 'package:shoot_mobile/core/theme/shoot_colors.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';

/// Opens the accent colour sheet (the theme is chosen in the menu), applied on
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

/// The sheet's content: the accent colour group in the Brief
/// Bar row grammar (44 px rows, a 30 px leading tile, a trailing check).
class AppearanceSheet extends StatelessWidget {
  const AppearanceSheet({super.key = const Key('appearance-sheet')});

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final accent = context.watch<AccentCubit>().state;
    final accentCubit = context.read<AccentCubit>();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    String accentName(ShootAccent a) => switch (a) {
      ShootAccent.brand => l10n.accentDefault,
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
            for (final a in ShootAccent.values)
              _OptionRow(
                optionKey: Key('accent-option-${a.id}'),
                name: accentName(a),
                selected: a == accent,
                onTap: () => accentCubit.select(a),
                leading: _OptionTile(
                  swatch: a == ShootAccent.brand
                      ? (isDark ? ShootColors.dark : ShootColors.light).primary
                      : (isDark ? a.dark : a.light).accent,
                ),
              ),
          ],
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

/// The 30 px leading tile: an accent's swatch.
class _OptionTile extends StatelessWidget {
  const _OptionTile({required this.swatch});

  final Color swatch;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return DecoratedBox(
      key: const Key('option-tile'),
      decoration: BoxDecoration(
        color: swatch,
        borderRadius: BorderRadius.circular(ShootRadius.tile),
        border: Border.all(color: c.hair),
      ),
      child: const SizedBox.square(dimension: ShootSize.tile),
    );
  }
}
