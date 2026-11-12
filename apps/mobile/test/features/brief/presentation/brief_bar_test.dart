import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/motion/ambient_pause.dart';
import 'package:shoot_mobile/features/brief/presentation/brief_bar.dart';
import 'package:shoot_mobile/features/brief/presentation/brief_cubit.dart';

import '../../../helpers/brief_fixtures.dart';
import '../../../helpers/ml_harness.dart';
import '../../../helpers/pump_app.dart';

Widget host(BriefCubit cubit) => Scaffold(
  body: SingleChildScrollView(
    child: AmbientPause(
      child: BlocBuilder<BriefCubit, BriefState>(
        bloc: cubit,
        builder: (context, state) => state.load != BriefLoad.ready
            ? const SizedBox()
            : BriefBar(
                state: state,
                clock: () => DateTime.utc(2026, 12, 5, 10),
                onTouch: cubit.touch,
                onChoose: cubit.choose,
                onContinue: cubit.continueStep,
                onSkip: cubit.skip,
                onDate: cubit.setDate,
                onReopen: cubit.reopen,
                onTakeBack: cubit.takeBack,
                onSubmit: () => cubit.submit(),
              ),
      ),
    ),
  ),
);

Future<BriefCubit> pumpBar(
  WidgetTester tester, {
  Locale locale = const Locale('en'),
}) async {
  final cubit = makeBrief(builder: exampleBuilder(arabic: locale.languageCode == 'ar'));
  await cubit.load();
  await tester.pumpApp(host(cubit), locale: locale);
  await tester.pump();
  return cubit;
}

void main() {
  testWidgets('ML-US1-S1 the bar writes an example once, the primary action shows, no answers', (
    tester,
  ) async {
    final cubit = await pumpBar(tester);
    expect(find.text("See price and who's free"), findsOneWidget);
    expect(find.text('No account needed. Price shown next.'), findsOneWidget);
    // Placeholders to begin with; the example fills the slots in turn from the CMS defaults.
    expect(find.text('which professional'), findsOneWidget);
    await tester.pump(const Duration(seconds: 4));
    expect(find.text('which professional'), findsNothing);
    expect(find.textContaining('hotographer'), findsOneWidget);
    // An illustration, never an answer.
    expect(cubit.state.draft.isEmpty, isTrue);
    expect(find.byKey(const ValueKey('briefBar:search')), findsNothing);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('ML-US1-S2 touching the bar stops the example and shows only the first step', (
    tester,
  ) async {
    final cubit = await pumpBar(tester);
    await tester.tap(find.byKey(const ValueKey('briefBar:sentence')));
    await tester.pump();
    expect(cubit.state.example, isFalse);
    expect(find.byKey(const ValueKey('briefBar:search')), findsOneWidget);
    expect(find.text('Photographer'), findsOneWidget);
    expect(find.text('Videographer'), findsOneWidget);
    // Only the first step's list: no occasion options yet.
    expect(find.text('Weddings'), findsNothing);
    expect(find.text('which professional'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('ML-US1-S3 a choice is printed into the sentence and the next step shows', (
    tester,
  ) async {
    final cubit = await pumpBar(tester);
    cubit.touch();
    await tester.pump();
    await tester.tap(find.byKey(const ValueKey('briefBar:option:persona:photographer')));
    await tester.pump();
    // Printed as a word, and the next unanswered step's list is showing.
    expect(
      find.descendant(
        of: find.byKey(const ValueKey('briefBar:slot:persona')),
        matching: find.textContaining('hotographer'),
      ),
      findsOneWidget,
    );
    expect(find.text('Weddings'), findsOneWidget);
    // Tapping the printed word reopens its step with the choice shown as chosen.
    await tester.tap(find.byKey(const ValueKey('briefBar:slot:persona')));
    await tester.pump();
    expect(cubit.state.active, 'persona');
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('ML-US1-S3 typing searches every step at once', (tester) async {
    final cubit = await pumpBar(tester);
    cubit.touch();
    await tester.pump();
    await tester.enterText(find.byKey(const ValueKey('briefBar:search')), 'dub');
    await tester.pump();
    expect(find.text('Dubai'), findsOneWidget);
    expect(find.text('Photographer'), findsNothing);
    await tester.tap(find.byKey(const ValueKey('briefBar:hit:location:dubai')));
    await tester.pump();
    expect(cubit.state.draft.valuesOf('location'), ['dubai']);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('ML-US1-S3 an optional step offers its skip', (tester) async {
    final cubit = await pumpBar(tester);
    cubit
      ..choose('persona', 'photographer')
      ..choose('occasion', 'wedding')
      ..choose('location', 'dubai');
    await tester.pump();
    expect(cubit.state.active, 'date');
    expect(find.byKey(const ValueKey('briefBar:skip')), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('briefBar:skip')));
    await tester.pump();
    expect(cubit.state.active, isNull);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('ML-US1-S5 an incomplete brief shows a one-line message naming the step', (
    tester,
  ) async {
    final cubit = await pumpBar(tester);
    await tester.tap(find.text("See price and who's free"));
    await tester.pump();
    expect(cubit.state.active, 'persona');
    expect(find.textContaining('Choose which professional'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('ML-US1-S8 in Arabic the sentence, options and messages are Arabic and run right to left', (
    tester,
  ) async {
    final cubit = await pumpBar(tester, locale: const Locale('ar'));
    final ar = exampleBuilder(arabic: true).builder!;
    expect(find.text(ar.submitLabel), findsOneWidget);
    expect(
      Directionality.of(tester.element(find.byKey(const ValueKey('briefBar')))),
      TextDirection.rtl,
    );
    cubit.touch();
    await tester.pump();
    final firstOption = ar.slots.first.options.first.label;
    expect(find.text(firstOption), findsOneWidget);
    await tester.tap(find.text(ar.submitLabel));
    await tester.pump();
    expect(find.textContaining('اختر'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('ML-US1-S6 the primary action records a complete brief', (tester) async {
    final repo = FakeBriefRepository();
    final cubit = makeBrief(repository: repo);
    await cubit.load();
    await tester.pumpApp(host(cubit));
    cubit
      ..choose('persona', 'photographer')
      ..choose('occasion', 'wedding')
      ..choose('location', 'dubai');
    await tester.pump();
    await tester.tap(find.text("See price and who's free"));
    await tester.pump();
    await tester.pump();
    expect(repo.recorded, hasLength(1));
    expect(cubit.state.receipt, isNotNull);
    await tester.pumpWidget(const SizedBox());
  });
}
