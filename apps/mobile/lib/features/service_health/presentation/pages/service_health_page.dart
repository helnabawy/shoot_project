import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shoot_mobile/core/di/injection.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/widgets/app_bar_actions.dart';
import 'package:shoot_mobile/features/service_health/presentation/cubit/service_health_cubit.dart';
import 'package:shoot_mobile/features/service_health/presentation/widgets/health_status_panel.dart';

/// Route entry: creates the cubit from DI and starts the first check.
class ServiceHealthPage extends StatelessWidget {
  const ServiceHealthPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider<ServiceHealthCubit>(
      create: (_) {
        final cubit = getIt<ServiceHealthCubit>();
        unawaited(cubit.check());
        return cubit;
      },
      child: const ServiceHealthView(),
    );
  }
}

/// The screen itself, separate from [ServiceHealthPage] so tests can supply
/// any cubit. One primary action: check again.
class ServiceHealthView extends StatelessWidget {
  const ServiceHealthView({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.appTitle),
        actions: const [
          LanguageButton(),
          AppearanceButton(),
          SizedBox(width: ShootSpace.s2),
        ],
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsetsDirectional.all(ShootSpace.s4),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: ShootSize.formColumn),
              child: BlocBuilder<ServiceHealthCubit, ServiceHealthState>(
                builder: (context, state) {
                  final busy =
                      state is ServiceHealthInitial ||
                      state is ServiceHealthLoading;
                  return Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Semantics(
                        header: true,
                        child: Text(
                          l10n.serviceHealthTitle,
                          style: textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      const SizedBox(height: ShootSpace.s4),
                      HealthStatusPanel(state: state),
                      const SizedBox(height: ShootSpace.s6),
                      FilledButton(
                        onPressed: busy
                            ? null
                            : () => unawaited(
                                context.read<ServiceHealthCubit>().check(),
                              ),
                        child: Text(l10n.serviceHealthRetry),
                      ),
                    ],
                  );
                },
              ),
            ),
          ),
        ),
      ),
    );
  }
}
