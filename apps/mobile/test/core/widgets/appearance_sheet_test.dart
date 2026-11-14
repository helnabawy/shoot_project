import 'dart:ui' show CheckedState;

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/l10n/locale_cubit.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_accent.dart';
import 'package:shoot_mobile/core/theme/shoot_colors.dart';
import 'package:shoot_mobile/core/widgets/app_bar_actions.dart';

import '../../helpers/pump_app.dart';

const _accentIds = ['brand', 'blue', 'teal', 'violet', 'magenta', 'graphite'];

/// A screen with the app bar's Appearance button, like every real screen.
Widget _screen() => Scaffold(
  appBar: AppBar(
    title: const Text('Host'),
    actions: const [AppearanceButton()],
  ),
);

Finder _accent(String id) => find.byKey(Key('accent-option-$id'));

ShootColors _colors(WidgetTester tester) =>
    Theme.of(tester.element(find.text('Host'))).extension<ShootColors>()!;

Future<void> _open(WidgetTester tester) async {
  await tester.tap(find.byKey(const Key('appearance-button')));
  await tester.pumpAndSettle();
}

bool _isChecked(WidgetTester tester, Finder row) =>
    tester.getSemantics(row).getSemanticsData().flagsCollection.isChecked ==
    CheckedState.isTrue;

void _setSize(WidgetTester tester, Size size) {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
}

void main() {
  const sizes = {
    'phone 360 x 640': Size(360, 640),
    'iPad portrait 768 x 1024': Size(768, 1024),
    'iPad landscape 1024 x 768': Size(1024, 768),
  };

  for (final MapEntry(key: sizeName, value: size) in sizes.entries) {
    group('at $sizeName', () {
      testWidgets(
        'MA-US1-S1 first launch lists the accents in order, Default first and selected',
        (tester) async {
          _setSize(tester, size);
          await tester.pumpApp(_screen(), themeMode: ThemeMode.system);
          await _open(tester);

          expect(find.byKey(const Key('appearance-sheet')), findsOneWidget);
          expect(find.text('Accent colour'), findsWidgets);
          expect(find.text('Theme'), findsNothing);

          // The five accents, in order, only Blue checked.
          final tops = [
            for (final id in _accentIds) tester.getTopLeft(_accent(id)).dy,
          ];
          expect(tops, orderedEquals([...tops]..sort()));
          expect(tops.toSet(), hasLength(6));
          for (final id in _accentIds) {
            expect(_isChecked(tester, _accent(id)), id == 'brand', reason: id);
          }
          expect(tester.takeException(), isNull);
        },
      );

      testWidgets(
        'MA-US1-S2 tapping an accent applies it to every selection role at once',
        (tester) async {
          _setSize(tester, size);
          await tester.pumpApp(_screen(), themeMode: ThemeMode.system);
          await _open(tester);

          await tester.tap(_accent('violet'));
          await tester.pumpAndSettle();

          final c = _colors(tester);
          final violet = ShootAccent.violet.light;
          expect(c.accent, violet.accent);
          expect(c.accentInk, violet.accentInk);
          expect(c.selected, violet.selected);
          expect(c.selectedHover, violet.selectedHover);
          expect(c.selectionWash, violet.selectionWash);
          expect(c.focus, violet.focus);

          // The sheet stays open and Violet is the only checked accent.
          expect(find.byKey(const Key('appearance-sheet')), findsOneWidget);
          for (final id in _accentIds) {
            expect(_isChecked(tester, _accent(id)), id == 'violet', reason: id);
          }
        },
      );

      testWidgets('MA-US1-S4 Arabic names, right to left, choice kept', (
        tester,
      ) async {
        _setSize(tester, size);
        await tester.pumpApp(
          _screen(),
          locale: const Locale('ar'),
          themeMode: ThemeMode.system,
        );
        await _open(tester);

        for (final name in [
          'الافتراضي',
          'أزرق',
          'فيروزي',
          'بنفسجي',
          'فوشي',
          'فحمي',
        ]) {
          expect(find.text(name), findsOneWidget);
        }
        expect(find.text('السمة'), findsNothing);
        expect(find.text('لون التمييز'), findsWidgets);

        final sheet = find.byKey(const Key('appearance-sheet'));
        expect(Directionality.of(tester.element(sheet)), TextDirection.rtl);

        // The tile is at the start (right) and the name sits to its left.
        final row = _accent('blue');
        final rowBox = tester.getRect(row);
        final tile = tester.getRect(
          find.descendant(
            of: row,
            matching: find.byKey(const Key('option-tile')),
          ),
        );
        expect(tile.right, greaterThan(rowBox.center.dx));
        expect(
          tester.getRect(find.text('أزرق')).right,
          lessThanOrEqualTo(tile.left),
        );

        // Choose Violet, then switch language with the sheet open.
        await tester.tap(_accent('violet'));
        await tester.pump();
        tester
            .element(find.byKey(const Key('appearance-sheet')))
            .read<LocaleCubit>()
            .select(const Locale('en'));
        await tester.pumpAndSettle();

        expect(find.text('Violet'), findsOneWidget);
        for (final id in _accentIds) {
          expect(_isChecked(tester, _accent(id)), id == 'violet', reason: id);
        }
      });

      testWidgets('MA-US1-S5 each option announces name and selected state', (
        tester,
      ) async {
        _setSize(tester, size);
        final semantics = tester.ensureSemantics();
        await tester.pumpApp(_screen(), themeMode: ThemeMode.system);
        await _open(tester);

        final names = {
          _accent('brand'): 'Default',
          _accent('blue'): 'Blue',
          _accent('teal'): 'Teal',
          _accent('violet'): 'Violet',
          _accent('magenta'): 'Magenta',
          _accent('graphite'): 'Graphite',
        };
        for (final MapEntry(key: row, value: name) in names.entries) {
          final selected = name == 'Default'; // the default
          expect(
            tester.getSemantics(row),
            isSemantics(
              label: name,
              hasCheckedState: true,
              isChecked: selected,
              isInMutuallyExclusiveGroup: true,
              hasTapAction: true,
            ),
            reason: name,
          );
          final box = tester.getSize(row);
          expect(box.height, greaterThanOrEqualTo(44), reason: name);
          expect(box.width, greaterThanOrEqualTo(44), reason: name);
        }
        semantics.dispose();
      });
    });
  }

  testWidgets(
    'MA-US1-S5 at text scale 2.0 the names wrap and no row overflows',
    (tester) async {
      _setSize(tester, const Size(360, 640));
      tester.platformDispatcher.textScaleFactorTestValue = 2;
      addTearDown(tester.platformDispatcher.clearAllTestValues);
      await tester.pumpApp(_screen(), themeMode: ThemeMode.system);
      await _open(tester);

      for (final id in _accentIds) {
        expect(_accent(id), findsOneWidget);
        expect(tester.getSize(_accent(id)).height, greaterThanOrEqualTo(44));
      }
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('device theme changes: Violet applies Violet dark roles '
      'without another choice', (tester) async {
    await tester.pumpApp(_screen(), themeMode: ThemeMode.system);
    await tester.pumpAndSettle();
    await _open(tester);
    await tester.tap(_accent('violet'));
    await tester.pumpAndSettle();
    expect(_colors(tester).accent, ShootAccent.violet.light.accent);

    tester.platformDispatcher.platformBrightnessTestValue = Brightness.dark;
    addTearDown(tester.platformDispatcher.clearAllTestValues);
    await tester.pumpAndSettle();

    expect(_colors(tester).accent, ShootAccent.violet.dark.accent);
    expect(
      Theme.of(tester.element(find.text('Host'))).extension<ShootColors>()!,
      isNot(same(AppTheme.dark.extension<ShootColors>())),
    );
  });

  testWidgets('the last row clears the system bar at the bottom', (
    tester,
  ) async {
    _setSize(tester, const Size(360, 900));
    // An Android navigation bar (or the iPhone home indicator area).
    const bar = FakeViewPadding(bottom: 48);
    tester.view.padding = bar;
    tester.view.viewPadding = bar;
    await tester.pumpApp(_screen(), themeMode: ThemeMode.system);
    await _open(tester);

    expect(
      tester.getRect(_accent('graphite')).bottom,
      lessThanOrEqualTo(900 - 48),
    );
  });

  testWidgets('the swatch tile shows the accent for the theme on screen', (
    tester,
  ) async {
    await tester.pumpApp(_screen(), themeMode: ThemeMode.system);
    await _open(tester);

    Color swatch(String id) {
      final tile = find.descendant(
        of: _accent(id),
        matching: find.byKey(const Key('option-tile')),
      );
      final box = tester.widget<DecoratedBox>(tile).decoration as BoxDecoration;
      return box.color!;
    }

    expect(swatch('teal'), ShootAccent.teal.light.accent);
    tester.platformDispatcher.platformBrightnessTestValue = Brightness.dark;
    addTearDown(tester.platformDispatcher.clearAllTestValues);
    await tester.pumpAndSettle();
    expect(swatch('teal'), ShootAccent.teal.dark.accent);
  });
}
