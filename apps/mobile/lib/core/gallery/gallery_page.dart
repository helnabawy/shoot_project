import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shoot_mobile/core/auth/session_cubit.dart';
import 'package:shoot_mobile/core/gallery/catalogue.dart';
import 'package:shoot_mobile/core/l10n/app_locales.dart';
import 'package:shoot_mobile/core/l10n/locale_cubit.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/theme/theme_mode_cubit.dart';

/// Debug builds only (`/_gallery`, FR-014): every catalogue component in every state, with
/// placeholder text from [catalogue], and switches for language and theme at the top. With a
/// [session] it starts with a "Session" section (feature 009): who is signed in, the token's
/// expiry, "Sign out" and "Expire token", for the manual checks until feature 013 builds the
/// account screen's sign-out.
class GalleryPage extends StatelessWidget {
  const GalleryPage({super.key, this.session});

  final SessionCubit? session;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Scaffold(
      backgroundColor: c.ground,
      appBar: AppBar(
        title: const Text('Gallery'),
        actions: [
          TextButton(
            onPressed: () {
              final arabic =
                  Localizations.localeOf(context).languageCode == 'ar';
              context.read<LocaleCubit>().select(
                arabic ? AppLocales.english : AppLocales.arabic,
              );
            },
            child: const Text('EN / ع'),
          ),
          IconButton(
            tooltip: 'Theme',
            icon: const Icon(Icons.contrast),
            onPressed: () {
              final dark = Theme.of(context).brightness == Brightness.dark;
              context.read<ThemeModeCubit>().select(
                dark ? ThemeMode.light : ThemeMode.dark,
              );
            },
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsetsDirectional.all(ShootSpace.s5),
        children: [
          if (session case final session?) SessionSection(session: session),
          for (final entry in catalogue) ...[
            Padding(
              padding: const EdgeInsetsDirectional.only(
                top: ShootSpace.s6,
                bottom: ShootSpace.s2,
              ),
              child: Text(
                entry.name,
                style: ShootType.groupLabel.copyWith(color: c.ink),
              ),
            ),
            for (final MapEntry(key: state, value: build)
                in entry.states.entries) ...[
              Padding(
                padding: const EdgeInsetsDirectional.only(
                  bottom: ShootSpace.s1,
                ),
                child: Text(
                  state,
                  style: ShootType.meta.copyWith(color: c.mute),
                ),
              ),
              build(context),
              const SizedBox(height: ShootSpace.s3),
            ],
          ],
        ],
      ),
    );
  }
}

/// Debug only: the session and two buttons to end it (feature 009, T066). Never shows the token.
class SessionSection extends StatelessWidget {
  const SessionSection({super.key, required this.session});

  final SessionCubit session;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return BlocBuilder<SessionCubit, SessionState>(
      bloc: session,
      builder: (context, state) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Session', style: ShootType.groupLabel.copyWith(color: c.ink)),
          const SizedBox(height: ShootSpace.s2),
          Text(switch (state) {
            SignedIn(:final session) =>
              'Signed in: user ${session.user.id} '
                  '(${session.user.accountType.name}), '
                  'token expires ${session.exp.toIso8601String()}',
            SignedOut() => 'Signed out',
            SessionUnknown() => 'Not read yet',
          }, style: ShootType.meta.copyWith(color: c.mute)),
          if (state is SignedIn)
            Wrap(
              spacing: ShootSpace.s2,
              children: [
                TextButton(
                  onPressed: () => unawaited(session.signOut()),
                  child: const Text('Sign out'),
                ),
                TextButton(
                  // Forgets the token here only; the server session stays (a 401 would follow).
                  onPressed: () => unawaited(session.expire()),
                  child: const Text('Expire token'),
                ),
              ],
            ),
        ],
      ),
    );
  }
}
