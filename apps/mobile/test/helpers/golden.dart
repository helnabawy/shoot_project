import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/l10n/locale_cubit.dart';
import 'package:shoot_mobile/core/theme/accent_cubit.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_accent.dart';
import 'package:shoot_mobile/core/theme/theme_mode_cubit.dart';

import 'in_memory_preferences_store.dart';

/// Goldens are made and checked on macOS with the pinned Flutter (`tool/goldens.sh`, the macOS CI
/// job with GOLDENS=1); without GOLDENS=1 the golden tests skip themselves (feature 007, R10).
final bool goldensEnabled = Platform.environment['GOLDENS'] == '1';

/// The four variants every screen is checked in.
enum Variant {
  enLight('en-light', Locale('en'), Brightness.light),
  enDark('en-dark', Locale('en'), Brightness.dark),
  arLight('ar-light', Locale('ar'), Brightness.light),
  arDark('ar-dark', Locale('ar'), Brightness.dark);

  const Variant(this.id, this.locale, this.brightness);

  final String id;
  final Locale locale;
  final Brightness brightness;
}

/// One manifest screen: its board size and the key elements the geometry gate compares.
typedef BoardSpec = ({
  String id,
  double w,
  double h,
  Map<String, String> boxes,
});

BoardSpec boardSpec(String id) {
  final manifest = jsonDecode(
    File('../../specs/design-system/canvas/manifest.json').readAsStringSync(),
  ) as Map<String, dynamic>;
  final screen = (manifest['screens'] as List)
      .cast<Map<String, dynamic>>()
      .firstWhere((s) => s['id'] == id);
  return (
    id: id,
    w: (screen['w'] as num).toDouble(),
    h: (screen['h'] as num).toDouble(),
    boxes: (screen['boxes'] as Map).cast<String, String>(),
  );
}

/// The app shell with fixed choices: language, theme and accent from [variant].
Widget goldenShell(Widget child, Variant variant) {
  final store = InMemoryPreferencesStore();
  return MultiBlocProvider(
    providers: [
      BlocProvider(create: (_) => LocaleCubit(store)..select(variant.locale)),
      BlocProvider(create: (_) => ThemeModeCubit(store)),
      BlocProvider(create: (_) => AccentCubit(store)),
    ],
    child: Builder(
      builder: (context) => MaterialApp(
        debugShowCheckedModeBanner: false,
        locale: context.watch<LocaleCubit>().state,
        theme: AppTheme.of(ShootAccent.blue, Brightness.light),
        darkTheme: AppTheme.of(ShootAccent.blue, Brightness.dark),
        themeMode: variant.brightness == Brightness.dark
            ? ThemeMode.dark
            : ThemeMode.light,
        supportedLocales: AppLocalizations.supportedLocales,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        builder: (context, child) => DefaultTextHeightBehavior(
          textHeightBehavior: const TextHeightBehavior(
            leadingDistribution: TextLeadingDistribution.even,
          ),
          child: child!,
        ),
        home: child,
      ),
    ),
  );
}

/// Sets the view, platform and motion the way every golden renders, and undoes it afterwards.
void _prepare(WidgetTester tester, Size logical, {double textScale = 1}) {
  tester.view
    ..physicalSize = logical * 2
    ..devicePixelRatio = 2
    ..padding = FakeViewPadding.zero
    ..viewPadding = FakeViewPadding.zero;
  tester.platformDispatcher
    ..textScaleFactorTestValue = textScale
    ..accessibilityFeaturesTestValue = const FakeAccessibilityFeatures(
      disableAnimations: true,
    );
  debugDefaultTargetPlatformOverride = TargetPlatform.android;
  debugDisableShadows = false;
  addTearDown(tester.view.reset);
  addTearDown(tester.platformDispatcher.clearAllTestValues);
}

/// The golden root captured at device pixel ratio 2, the scale the board references use.
Future<void> _matchAt2x(WidgetTester tester, String path) async {
  final boundary = tester.renderObject<RenderRepaintBoundary>(
    find.byKey(const ValueKey('golden')),
  );
  final image = await tester.runAsync(() => boundary.toImage(pixelRatio: 2));
  await expectLater(image, matchesGoldenFile(path));
  image!.dispose();
}

/// Restores what the test binding checks at the end of every test.
void _restore() {
  debugDefaultTargetPlatformOverride = null;
  debugDisableShadows = true;
}

/// Renders [child] as screen [id] in [variant] at the board's size, 2×, animations off, and
/// asserts `goldens/<id>/<variant>.png` next to the calling test. Also writes (when updating) or
/// checks the key-element boxes in `<variant>.boxes.json`, from every `ValueKey('fidelity:<name>')`
/// the manifest names, in logical pixels.
Future<void> pumpBoard(
  WidgetTester tester, {
  required String id,
  required Variant variant,
  required Widget child,
  String goldensDir = 'test/goldens/screens/goldens',
}) async {
  final spec = boardSpec(id);
  _prepare(tester, Size(spec.w, spec.h));
  try {
    await tester.pumpWidget(
      RepaintBoundary(
        key: const ValueKey('golden'),
        child: goldenShell(child, variant),
      ),
    );
    await tester.pumpAndSettle();

    final boxes = <String, Map<String, double>>{};
    for (final name in spec.boxes.keys) {
      final finder = find.byKey(ValueKey('fidelity:$name'));
      expect(
        finder,
        findsOneWidget,
        reason: 'screen $id has no fidelity:$name',
      );
      final r = tester.getRect(finder);
      boxes[name] = {'x': r.left, 'y': r.top, 'w': r.width, 'h': r.height};
    }
    final boxesFile = File('$goldensDir/$id/${variant.id}.boxes.json');
    final json = const JsonEncoder.withIndent('  ').convert(boxes);
    if (autoUpdateGoldenFiles) {
      boxesFile.parent.createSync(recursive: true);
      boxesFile.writeAsStringSync('$json\n');
    } else {
      expect(
        boxesFile.existsSync() ? boxesFile.readAsStringSync() : '',
        '$json\n',
        reason:
            '$id/${variant.id}.boxes.json is stale; run tool/goldens.sh --update',
      );
    }

    await _matchAt2x(tester, 'goldens/$id/${variant.id}.png');
  } finally {
    _restore();
  }
}

/// Self-baselines where the canvas has no board (FR-046): 393 and 430 wide, iPad 768×1024 and
/// 1024×1366, and text scale 2.0 at the board size. An overflow fails the test.
Future<void> pumpSelfBaselines(
  WidgetTester tester, {
  required String id,
  required Widget child,
  Variant variant = Variant.enLight,
}) async {
  final spec = boardSpec(id);
  final cases = <String, (Size, double)>{
    '393': (const Size(393, 852), 1),
    '430': (const Size(430, 932), 1),
    'ipad-768': (const Size(768, 1024), 1),
    'ipad-1024': (const Size(1024, 1366), 1),
    'text-2x': (Size(spec.w, spec.h), 2),
  };
  for (final MapEntry(key: name, value: (size, scale)) in cases.entries) {
    _prepare(tester, size, textScale: scale);
    try {
      await tester.pumpWidget(
        RepaintBoundary(
          key: const ValueKey('golden'),
          child: goldenShell(child, variant),
        ),
      );
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull, reason: '$id at $name');
      await _matchAt2x(tester, 'goldens/$id/self/$name.png');
    } finally {
      _restore();
    }
  }
}
