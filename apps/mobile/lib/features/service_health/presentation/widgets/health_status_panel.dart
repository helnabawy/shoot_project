import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/l10n/failure_message.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/features/service_health/domain/entities/service_health.dart';
import 'package:shoot_mobile/features/service_health/presentation/cubit/service_health_cubit.dart';

/// One panel row: a status tile and a sentence. Announced to screen readers
/// whenever it changes (live region).
class HealthStatusPanel extends StatelessWidget {
  const HealthStatusPanel({required this.state, super.key});

  final ServiceHealthState state;

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final l10n = context.l10n;

    final (
      Color tileColor,
      Color iconColor,
      Widget glyph,
      String text,
    ) = switch (state) {
      ServiceHealthInitial() || ServiceHealthLoading() => (
        colors.tile,
        colors.tileInk,
        SizedBox.square(
          dimension: 16,
          child: CircularProgressIndicator(
            strokeWidth: 2,
            color: colors.tileInk,
          ),
        ),
        l10n.serviceHealthChecking,
      ),
      ServiceHealthLoaded(:final health) when health.isHealthy => (
        colors.success,
        colors.onSuccess,
        const Icon(Icons.check_rounded, size: 18),
        l10n.serviceHealthHealthy,
      ),
      ServiceHealthLoaded(health: ServiceHealth()) => (
        colors.attention,
        colors.onAttention,
        const Icon(Icons.priority_high_rounded, size: 18),
        l10n.serviceHealthDegraded,
      ),
      ServiceHealthFailed(:final failure) => (
        colors.danger,
        colors.onDanger,
        const Icon(Icons.close_rounded, size: 18),
        failure.message(l10n),
      ),
    };

    return DecoratedBox(
      decoration: BoxDecoration(
        color: colors.panel,
        borderRadius: BorderRadius.circular(ShootRadius.panel),
        border: Border.all(color: colors.hair),
      ),
      child: Padding(
        padding: const EdgeInsetsDirectional.symmetric(
          horizontal: ShootSpace.s4,
          vertical: ShootSpace.s3,
        ),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: ShootSize.rowHeight),
          child: Row(
            children: [
              ExcludeSemantics(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: tileColor,
                    borderRadius: BorderRadius.circular(ShootRadius.tile),
                  ),
                  child: SizedBox.square(
                    dimension: ShootSize.tile,
                    child: Center(
                      child: IconTheme.merge(
                        data: IconThemeData(color: iconColor),
                        child: glyph,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: ShootSpace.s3),
              Expanded(
                child: Semantics(
                  liveRegion: true,
                  child: Text(
                    text,
                    style: Theme.of(context).textTheme.bodyLarge
                        ?.copyWith(color: colors.ink),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
