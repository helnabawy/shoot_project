// The plan names screen goldens by board number (`<id>_<name>_golden_test.dart`).
// ignore_for_file: file_names
@Tags(['golden'])
library;

import 'package:flutter/widgets.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/features/sign_in/presentation/cubit/sign_in_flow_cubit.dart';
import 'package:shoot_mobile/features/sign_in/presentation/pages/code_page.dart';

import '../../helpers/golden.dart';
import '../../helpers/sign_in_harness.dart';

/// Screen 21 (S09b-signin-code) from the shared examples: four digits typed, the countdown at
/// 0:42 on the fixed clock, "I need a …" chosen, the professions from `GET personas`.
Widget _screen(Variant variant) {
  final arabic = variant.locale.languageCode == 'ar';
  final cubit = flowCubit(
    repository: MockAuthRepository(),
    initial: SignInFlowState(
      status: SignInStatus.awaitingCode,
      challenge: exampleChallenge(),
      code: '4827',
      personas: examplePersonas(arabic: arabic),
      // Board 21 is the new-number case: the role question after a proven code.
      roleNeeded: true,
    ),
  );
  return BlocProvider.value(value: cubit, child: const CodePage());
}

void main() {
  for (final variant in Variant.values) {
    testWidgets(
      'OT-US1-S1 screen 21 renders to its board in ${variant.id}',
      (tester) => pumpBoard(
        tester,
        id: '21',
        variant: variant,
        child: _screen(variant),
      ),
      skip: !goldensEnabled,
    );
  }

  testWidgets(
    'screen 21 self-baselines: no overflow at 393, 430, iPad and text scale 2',
    (tester) =>
        pumpSelfBaselines(tester, id: '21', child: _screen(Variant.enLight)),
    skip: !goldensEnabled,
  );
}
