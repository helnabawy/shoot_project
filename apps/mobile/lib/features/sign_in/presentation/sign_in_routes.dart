import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/routing/app_routes.dart';
import 'package:shoot_mobile/core/web/website_links.dart';
import 'package:shoot_mobile/features/sign_in/presentation/cubit/sign_in_flow_cubit.dart';
import 'package:shoot_mobile/features/sign_in/presentation/pages/code_page.dart';
import 'package:shoot_mobile/features/sign_in/presentation/pages/join_page.dart';
import 'package:shoot_mobile/features/sign_in/presentation/pages/number_page.dart';

/// `/login` (20), `/login/code` (21, 22) and `/register` (23) under one [ShellRoute] that provides
/// a [SignInFlowCubit], so the number, channel and challenge survive moving between them
/// (research R15). The cubit is made when a sign-in screen opens and closed when the person
/// leaves them. `/login/code` with no code on its way goes to `/login`.
List<RouteBase> signInRoutes({
  required SignInFlowCubit Function() createFlow,
  required WebsiteLinks links,
}) {
  final scope = _FlowHolder(createFlow);
  return [
    ShellRoute(
      builder: (context, state, child) =>
          _FlowScope(holder: scope, child: child),
      routes: [
        GoRoute(
          path: AppRoutes.login,
          builder: (context, state) => const NumberPage(),
          routes: [
            GoRoute(
              path: 'code',
              redirect: (context, state) =>
                  scope.open().state.challenge == null ? AppRoutes.login : null,
              builder: (context, state) => const CodePage(),
            ),
          ],
        ),
        GoRoute(
          path: AppRoutes.register,
          builder: (context, state) => JoinPage(links: links),
        ),
      ],
    ),
  ];
}

/// Holds the flow cubit while a sign-in screen is open.
final class _FlowHolder {
  _FlowHolder(this._create);

  final SignInFlowCubit Function() _create;
  SignInFlowCubit? current;

  SignInFlowCubit open() {
    final existing = current;
    if (existing != null && !existing.isClosed) return existing;
    final created = _create();
    unawaited(created.loadPersonas());
    return current = created;
  }

  void close(SignInFlowCubit cubit) {
    if (identical(current, cubit)) current = null;
    unawaited(cubit.close());
  }
}

class _FlowScope extends StatefulWidget {
  const _FlowScope({required this.holder, required this.child});

  final _FlowHolder holder;
  final Widget child;

  @override
  State<_FlowScope> createState() => _FlowScopeState();
}

class _FlowScopeState extends State<_FlowScope> {
  late final SignInFlowCubit _cubit = widget.holder.open();

  @override
  void dispose() {
    widget.holder.close(_cubit);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) =>
      BlocProvider<SignInFlowCubit>.value(value: _cubit, child: widget.child);
}
