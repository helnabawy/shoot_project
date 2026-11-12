// The plan names screen goldens by board number (`<id>_<name>_golden_test.dart`).
// ignore_for_file: file_names
@Tags(['golden'])
library;

import 'package:flutter/widgets.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/web/website_links.dart';
import 'package:shoot_mobile/features/sign_in/presentation/cubit/sign_in_flow_cubit.dart';
import 'package:shoot_mobile/features/sign_in/presentation/pages/join_page.dart';

import '../../helpers/golden.dart';
import '../../helpers/sign_in_harness.dart';

/// Screen 23 (S09c-join) from the shared examples: the professions from `GET personas` plus
/// "Both", the first chosen, nothing typed.
Widget _screen(Variant variant) {
  final arabic = variant.locale.languageCode == 'ar';
  final cubit = flowCubit(
    repository: MockAuthRepository(),
    initial: SignInFlowState(
      mode: SignInMode.join,
      personas: examplePersonas(arabic: arabic),
      joinPersonas: const ['photographer'],
    ),
  );
  return BlocProvider.value(
    value: cubit,
    child: const JoinPage(links: WebsiteLinks(testConfig)),
  );
}

void main() {
  for (final variant in Variant.values) {
    testWidgets(
      'OT-US4-S3 screen 23 renders to its board in ${variant.id}',
      (tester) => pumpBoard(
        tester,
        id: '23',
        variant: variant,
        child: _screen(variant),
      ),
      skip: !goldensEnabled,
    );
  }

  testWidgets(
    'screen 23 self-baselines: no overflow at 393, 430, iPad and text scale 2',
    (tester) =>
        pumpSelfBaselines(tester, id: '23', child: _screen(Variant.enLight)),
    skip: !goldensEnabled,
  );
}
