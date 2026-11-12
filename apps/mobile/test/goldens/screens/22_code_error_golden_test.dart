// The plan names screen goldens by board number (`<id>_<name>_golden_test.dart`).
// ignore_for_file: file_names
@Tags(['golden'])
library;

import 'package:flutter/widgets.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/time/clock.dart';
import 'package:shoot_mobile/features/sign_in/presentation/cubit/sign_in_flow_cubit.dart';
import 'package:shoot_mobile/features/sign_in/presentation/pages/code_page.dart';

import '../../helpers/golden.dart';
import '../../helpers/sign_in_harness.dart';

/// Screen 22 (S09d-code-error) from the shared examples: a wrong 482713, the countdown at 0:24
/// on the fixed clock.
Widget _screen(Variant variant) {
  final arabic = variant.locale.languageCode == 'ar';
  final cubit = flowCubit(
    repository: MockAuthRepository(),
    clock: FixedClock(DateTime.utc(2026, 12, 14, 6, 0, 36)),
    initial: SignInFlowState(
      status: SignInStatus.codeInvalid,
      challenge: exampleChallenge(),
      code: '482713',
      errorCount: 1,
      failure: const ServerFailure(
        statusCode: 422,
        code: 'auth.errors.codeInvalid',
      ),
      personas: examplePersonas(arabic: arabic),
    ),
  );
  return BlocProvider.value(value: cubit, child: const CodePage());
}

void main() {
  for (final variant in Variant.values) {
    testWidgets(
      'OT-US1-S4 screen 22 renders to its board in ${variant.id}',
      (tester) => pumpBoard(
        tester,
        id: '22',
        variant: variant,
        child: _screen(variant),
      ),
      skip: !goldensEnabled,
    );
  }

  testWidgets(
    'screen 22 self-baselines: no overflow at 393, 430, iPad and text scale 2',
    (tester) =>
        pumpSelfBaselines(tester, id: '22', child: _screen(Variant.enLight)),
    skip: !goldensEnabled,
  );
}
