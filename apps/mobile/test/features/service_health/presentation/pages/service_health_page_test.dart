import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/features/service_health/domain/entities/service_health.dart';
import 'package:shoot_mobile/features/service_health/presentation/cubit/service_health_cubit.dart';
import 'package:shoot_mobile/features/service_health/presentation/pages/service_health_page.dart';

import '../../../../helpers/pump_app.dart';

class _MockCubit extends MockCubit<ServiceHealthState>
    implements ServiceHealthCubit {}

void main() {
  late _MockCubit cubit;

  setUp(() {
    cubit = _MockCubit();
    when(() => cubit.check()).thenAnswer((_) async {});
  });

  Widget subject() => BlocProvider<ServiceHealthCubit>.value(
    value: cubit,
    child: const ServiceHealthView(),
  );

  testWidgets('shows the healthy status and checks again on tap', (
    tester,
  ) async {
    when(() => cubit.state).thenReturn(
      const ServiceHealthLoaded(ServiceHealth(status: HealthStatus.healthy)),
    );

    await tester.pumpApp(subject());

    expect(find.text('Service status'), findsOneWidget);
    expect(find.text('Everything is running.'), findsOneWidget);

    await tester.tap(find.widgetWithText(FilledButton, 'Check again'));
    verify(() => cubit.check()).called(1);
  });

  testWidgets('disables the action while checking', (tester) async {
    when(() => cubit.state).thenReturn(const ServiceHealthLoading());

    await tester.pumpApp(subject());

    expect(find.text('Checking the service…'), findsOneWidget);
    final button = tester.widget<FilledButton>(find.byType(FilledButton));
    expect(button.onPressed, isNull);
  });

  testWidgets('shows a localized failure message', (tester) async {
    when(() => cubit.state)
        .thenReturn(const ServiceHealthFailed(NetworkFailure()));

    await tester.pumpApp(subject());

    expect(
      find.text(
        "We can't reach the service. Check your connection and try again.",
      ),
      findsOneWidget,
    );
  });

  testWidgets('renders in Arabic, right to left, in the dark theme', (
    tester,
  ) async {
    when(() => cubit.state).thenReturn(
      const ServiceHealthLoaded(ServiceHealth(status: HealthStatus.degraded)),
    );

    await tester.pumpApp(
      subject(),
      locale: const Locale('ar'),
      themeMode: ThemeMode.dark,
    );

    expect(find.text('حالة الخدمة'), findsOneWidget);
    expect(
      find.text('الخدمة تعمل، لكن قاعدة البيانات لا تستجيب.'),
      findsOneWidget,
    );
    final context = tester.element(find.byType(ServiceHealthView));
    expect(Directionality.of(context), TextDirection.rtl);
    expect(Theme.of(context).brightness, Brightness.dark);
  });
}
