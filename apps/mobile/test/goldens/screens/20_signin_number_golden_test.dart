// The plan names screen goldens by board number (`<id>_<name>_golden_test.dart`).
// ignore_for_file: file_names
@Tags(['golden'])
library;

import 'package:flutter/widgets.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/features/sign_in/presentation/cubit/sign_in_flow_cubit.dart';
import 'package:shoot_mobile/features/sign_in/presentation/pages/number_page.dart';

import '../../helpers/golden.dart';
import '../../helpers/sign_in_harness.dart';

/// Screen 20 (S09-signin-number): an empty number, SMS chosen.
Widget _screen(Variant variant) {
  final arabic = variant.locale.languageCode == 'ar';
  final cubit = flowCubit(
    repository: MockAuthRepository(),
    initial: SignInFlowState(personas: examplePersonas(arabic: arabic)),
  );
  return BlocProvider.value(value: cubit, child: const NumberPage());
}

void main() {
  for (final variant in Variant.values) {
    testWidgets(
      'OT-US1-S9 screen 20 renders to its board in ${variant.id}',
      (tester) => pumpBoard(
        tester,
        id: '20',
        variant: variant,
        child: _screen(variant),
      ),
      skip: !goldensEnabled,
    );
  }

  testWidgets(
    'screen 20 self-baselines: no overflow at 393, 430, iPad and text scale 2',
    (tester) =>
        pumpSelfBaselines(tester, id: '20', child: _screen(Variant.enLight)),
    skip: !goldensEnabled,
  );
}
