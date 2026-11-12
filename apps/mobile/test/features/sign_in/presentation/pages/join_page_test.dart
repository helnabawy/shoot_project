import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/auth/session.dart';
import 'package:shoot_mobile/core/content/audience.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/widgets/check_line.dart';
import 'package:shoot_mobile/core/widgets/phone_field.dart';
import 'package:shoot_mobile/core/widgets/segmented_control.dart';
import 'package:shoot_mobile/features/sign_in/domain/entities/otp_challenge.dart';
import 'package:shoot_mobile/features/sign_in/presentation/cubit/sign_in_flow_cubit.dart';

import '../../../../helpers/sign_in_harness.dart';

void main() {
  late MockAuthRepository repository;
  final personas = examplePersonas();

  setUpAll(() => registerFallbackValue(OtpChannel.sms));

  setUp(() {
    repository = MockAuthRepository();
    when(
      () => repository.requestCode(
        phone: any(named: 'phone'),
        channel: any(named: 'channel'),
      ),
    ).thenAnswer((_) async => Ok(exampleChallenge()));
  });

  Persona persona(String slug, String singular) => Persona(
    id: slug,
    slug: slug,
    singular: singular,
    plural: '${singular}s',
    glyph: null,
    description: null,
  );

  List<String> segmentLabels(WidgetTester tester) => tester
      .widget<SegmentedControl<String>>(find.byType(SegmentedControl<String>))
      .segments
      .map((s) => s.$2)
      .toList();

  group('OT-US4-S3 the professions shown are the active personas, with no combined segment', () {
    testWidgets('OT-US4-S3 two active personas: the two singulars', (
      tester,
    ) async {
      await pumpSignIn(
        tester,
        cubit: flowCubit(repository: repository, personas: personas),
        location: '/register',
      );
      await tester.pumpAndSettle();
      expect(segmentLabels(tester), ['Photographer', 'Videographer']);
    });

    testWidgets('OT-US4-S3 in Arabic, from personas.ar', (tester) async {
      await pumpSignIn(
        tester,
        cubit: flowCubit(
          repository: repository,
          personas: examplePersonas(arabic: true),
        ),
        location: '/register',
        locale: const Locale('ar'),
      );
      await tester.pumpAndSettle();
      expect(segmentLabels(tester), ['مصوّر', 'مصوّر فيديو']);
    });

    testWidgets('OT-US4-S3 three personas: no "All" segment', (tester) async {
      await pumpSignIn(
        tester,
        cubit: flowCubit(
          repository: repository,
          personas: [...personas, persona('editor-of-films', 'Film editor')],
        ),
        location: '/register',
      );
      await tester.pumpAndSettle();
      expect(segmentLabels(tester), [
        'Photographer',
        'Videographer',
        'Film editor',
      ]);
    });

    testWidgets('OT-US4-S3 one persona: no combined segment', (tester) async {
      await pumpSignIn(
        tester,
        cubit: flowCubit(repository: repository, personas: [personas.first]),
        location: '/register',
      );
      await tester.pumpAndSettle();
      expect(segmentLabels(tester), ['Photographer']);
    });

    testWidgets(
      'OT-US4-S3 (T075) a renamed, reordered or switched-off persona changes the segments',
      (tester) async {
        await pumpSignIn(
          tester,
          cubit: flowCubit(
            repository: repository,
            personas: [
              persona('videographer', 'Filmmaker'),
              persona('teacher', 'Tutor'),
            ],
          ),
          location: '/register',
        );
        await tester.pumpAndSettle();
        expect(segmentLabels(tester), ['Filmmaker', 'Tutor']);
      },
    );

    testWidgets('choosing a segment selects that one persona', (tester) async {
      final cubit = flowCubit(repository: repository, personas: personas);
      await pumpSignIn(tester, cubit: cubit, location: '/register');
      await tester.pumpAndSettle();
      expect(cubit.state.joinPersonas, ['photographer']);
      await tester.tap(find.text('Videographer'));
      await tester.pump();
      expect(cubit.state.joinPersonas, ['videographer']);
    });
  });

  testWidgets(
    'OT-US4-S4 "Send code" without the box ticked calls nothing and shows the checkbox\'s message',
    (tester) async {
      await pumpSignIn(
        tester,
        cubit: flowCubit(repository: repository, personas: personas),
        location: '/register',
      );
      await tester.pumpAndSettle();
      await tester.enterText(
        find.descendant(
          of: find.byKey(const ValueKey('join:phone')),
          matching: find.byType(TextField),
        ),
        '50 123 4567',
      );
      await tester.tap(find.text('Send code'));
      await tester.pumpAndSettle();

      expect(
        find.text(
          'Please accept the Terms and the Privacy Policy to create an account.',
        ),
        findsOneWidget,
      );
      expect(tester.widget<CheckLine>(find.byType(CheckLine)).error, isTrue);
      verifyZeroInteractions(repository);
    },
  );

  testWidgets(
    'ticked, Send code sends and opens screen 21 without the role question',
    (tester) async {
      final cubit = flowCubit(repository: repository, personas: personas);
      final router = await pumpSignIn(
        tester,
        cubit: cubit,
        location: '/register',
      );
      await tester.pumpAndSettle();
      await tester.enterText(
        find.descendant(
          of: find.byKey(const ValueKey('join:phone')),
          matching: find.byType(TextField),
        ),
        '50 123 4567',
      );
      await tester.tapAt(
        tester.getTopLeft(find.byType(CheckLine)) + const Offset(11, 11),
      );
      await tester.tap(find.text('Send code'));
      await tester.pumpAndSettle();
      expect(locationOf(router), '/login/code');
      expect(cubit.state.asksRole, isFalse);
    },
  );

  testWidgets(
    'OT-US4-S2 in finish mode the number is read-only with "Change number" and the Top Hit reads Continue',
    (tester) async {
      await pumpSignIn(
        tester,
        cubit: flowCubit(
          repository: repository,
          personas: personas,
          initial: SignInFlowState(
            status: SignInStatus.finishing,
            phone: '050 123 4567',
            challenge: exampleChallenge(),
            code: '482713',
            role: AccountType.provider,
            personas: personas,
            joinPersonas: const ['photographer'],
          ),
        ),
        location: '/register',
      );
      await tester.pumpAndSettle();
      expect(
        tester.widget<PhoneField>(find.byType(PhoneField)).readOnly,
        isTrue,
      );
      expect(
        tester
            .widget<TextField>(
              find.descendant(
                of: find.byType(PhoneField),
                matching: find.byType(TextField),
              ),
            )
            .controller!
            .text,
        '50 123 4567',
      );
      expect(find.text('Change number'), findsOneWidget);
      expect(find.text('Continue'), findsOneWidget);
      expect(find.text('Send code'), findsNothing);
    },
  );
}
