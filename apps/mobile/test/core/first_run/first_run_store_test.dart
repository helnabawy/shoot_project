import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/first_run/first_run_store.dart';
import 'package:shoot_mobile/core/preferences/preferences_store.dart';
import 'package:shoot_mobile/core/routing/app_router.dart';

import '../../helpers/in_memory_preferences_store.dart';

void main() {
  test('MF-US5-S4 the first-run flag survives a restart', () async {
    final store = InMemoryPreferencesStore();
    final first = FirstRunStore(store);
    expect(first.welcomeSeen, isFalse);
    await first.markWelcomeSeen();
    expect(first.welcomeSeen, isTrue);
    expect(store.values[PreferenceKeys.welcomeSeen], 'true');

    // A new instance is the next launch.
    expect(FirstRunStore(store).welcomeSeen, isTrue);
  });

  test('MF-US5-S4 an unreadable or unknown value means not seen', () {
    final unreadable = InMemoryPreferencesStore({
      PreferenceKeys.welcomeSeen: 'true',
    })..failReads = true;
    expect(FirstRunStore(unreadable).welcomeSeen, isFalse);
    expect(
      FirstRunStore(
        InMemoryPreferencesStore({PreferenceKeys.welcomeSeen: 'maybe'}),
      ).welcomeSeen,
      isFalse,
    );
  });

  test('MF-US5-S4 a failed write keeps the value for this session', () async {
    final store = InMemoryPreferencesStore()..failWrites = true;
    final firstRun = FirstRunStore(store);
    await firstRun.markWelcomeSeen();
    expect(firstRun.welcomeSeen, isTrue);
    expect(FirstRunStore(store).welcomeSeen, isFalse);
  });

  group('first-run redirect', () {
    const built = [
      AppRoute(
        AppRoutes.welcome,
        owner: '010',
        example: '/welcome/1',
        built: true,
      ),
    ];

    test('is inactive until feature 010 builds the welcome steps', () {
      expect(
        firstRunRedirect(isFirstNavigation: true, welcomeSeen: false),
        isNull,
      );
    });

    test('a plain first launch goes to the first step, once', () {
      expect(
        firstRunRedirect(
          isFirstNavigation: true,
          welcomeSeen: false,
          table: built,
        ),
        '/welcome/1',
      );
      expect(
        firstRunRedirect(
          isFirstNavigation: true,
          welcomeSeen: true,
          table: built,
        ),
        isNull,
      );
    });

    test('deep links and later navigations never redirect', () {
      expect(
        firstRunRedirect(
          isFirstNavigation: false,
          welcomeSeen: false,
          table: built,
        ),
        isNull,
      );
    });
  });
}
