import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/routing/app_routes.dart';
import 'package:shoot_mobile/features/brief/presentation/brief_cubit.dart';
import 'package:shoot_mobile/features/welcome/presentation/welcome_cubit.dart';
import 'package:shoot_mobile/features/welcome/presentation/welcome_pages.dart';

/// `/welcome/:step` (feature 010): 0 the splash, 1 to 3 the learning steps. One [WelcomeCubit] for
/// the visit (its content is read once, behind the splash); the app's [BriefCubit] is provided so
/// "Start a brief" can open the bar. A step outside 0 to 3 goes to the landing.
RouteBase welcomeRoute({
  required WelcomeCubit Function() createWelcome,
  required BriefCubit brief,
}) {
  WelcomeCubit? shared;
  WelcomeCubit open() {
    final existing = shared;
    if (existing != null) return existing;
    final created = shared = createWelcome();
    unawaited(created.load());
    return created;
  }

  return GoRoute(
    path: AppRoutes.welcome,
    redirect: (context, state) {
      final step = int.tryParse(state.pathParameters['step'] ?? '');
      return step == null || step < 0 || step > welcomeStepCount
          ? AppRoutes.home
          : null;
    },
    builder: (context, state) => MultiBlocProvider(
      providers: [
        BlocProvider<WelcomeCubit>.value(value: open()),
        BlocProvider<BriefCubit>.value(value: brief),
      ],
      child: WelcomeRoute(
        key: ValueKey('welcome:${state.pathParameters['step']}'),
        step: int.parse(state.pathParameters['step']!),
      ),
    ),
  );
}
