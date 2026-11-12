import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/theme/accent_cubit.dart';
import 'package:shoot_mobile/core/theme/shoot_accent.dart';

import '../../helpers/in_memory_preferences_store.dart';

void main() {
  test('starts at Blue', () {
    expect(AccentCubit(InMemoryPreferencesStore()).state, ShootAccent.brand);
  });

  blocTest<AccentCubit, ShootAccent>(
    'select(violet) emits violet',
    build: () => AccentCubit(InMemoryPreferencesStore()),
    act: (cubit) => cubit.select(ShootAccent.violet),
    expect: () => [ShootAccent.violet],
  );

  blocTest<AccentCubit, ShootAccent>(
    'selecting the current accent emits nothing',
    build: () => AccentCubit(InMemoryPreferencesStore()),
    act: (cubit) => cubit.select(ShootAccent.brand),
    expect: () => <ShootAccent>[],
  );
}
