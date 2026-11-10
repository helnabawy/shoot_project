import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/routing/app_router.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';

/// Shown for an unknown route or deep link.
class NotFoundPage extends StatelessWidget {
  const NotFoundPage({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final textTheme = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(),
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsetsDirectional.all(ShootSpace.s6),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: ShootSize.formColumn),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Semantics(
                    header: true,
                    child: Text(
                      l10n.notFoundTitle,
                      style: textTheme.headlineSmall,
                    ),
                  ),
                  const SizedBox(height: ShootSpace.s2),
                  Text(
                    l10n.notFoundBody,
                    style: textTheme.bodyLarge?.copyWith(
                      color: context.colors.mute,
                    ),
                  ),
                  const SizedBox(height: ShootSpace.s6),
                  FilledButton(
                    onPressed: () => context.go(AppRoutes.home),
                    child: Text(l10n.notFoundAction),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
