import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/content/audience.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/l10n/failure_message.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/routing/app_routes.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/widgets/css_line_box.dart';
import 'package:shoot_mobile/core/widgets/language_action.dart';
import 'package:shoot_mobile/core/widgets/shoot_header.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon_button.dart';
import 'package:shoot_mobile/core/widgets/wordmark.dart';
import 'package:shoot_mobile/features/sign_in/domain/entities/otp_challenge.dart';
import 'package:shoot_mobile/features/sign_in/presentation/cubit/sign_in_flow_cubit.dart';

/// The pieces screens 20–23 share. Type follows the boards: the sign-in boards 20 and 21 set
/// `.h1` at line-height 1.25 and `.body` at 1.625; 22 and 23 use the system's 1.2 and 1.6.

/// `.hd` on boards 20–23: back, the wordmark centred, and the language action (or the empty
/// 44 px `.ib` of boards 21 and 22).
class SignInHeader extends StatelessWidget {
  const SignInHeader({super.key, required this.onBack, this.language = true});

  final VoidCallback onBack;
  final bool language;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return ShootHeader(
      leadsWithBack: true,
      leading: ShootIconButton(
        icon: ShootIcons.back,
        label: l10n.backAction,
        onPressed: onBack,
      ),
      middle: Wordmark(
        label: l10n.appTitle,
        onTap: () => context.go(AppRoutes.home),
      ),
      trailing: [
        if (language)
          const LanguageAction(square: true)
        else
          const SizedBox.square(dimension: ShootSize.iconButton),
      ],
    );
  }
}

/// The heading and the line under it (`gap: 10`).
class SignInTitle extends StatelessWidget {
  const SignInTitle({
    super.key,
    required this.title,
    required this.body,
    this.tight = false,
  });

  final String title;
  final Widget body;

  /// Boards 22 and 23: `.h1` at 1.2.
  final bool tight;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 10,
      children: [
        Semantics(
          header: true,
          child: CssLineBox(
            key: const ValueKey('fidelity:h1'),
            fontSize: 34,
            height: tight ? 1.2 : 1.25,
            child: Text(
              title,
              style: ShootType.display.copyWith(
                height: tight ? 1.2 : 1.25,
                color: context.colors.ink,
              ),
            ),
          ),
        ),
        CssLineBox(fontSize: 15, height: tight ? 1.6 : 1.625, child: body),
      ],
    );
  }
}

/// `.body` in `bodyInk`; 1.625 on boards 20 and 21, 1.6 on 22 and 23.
TextStyle signInBody(BuildContext context, {bool tight = false}) => ShootType
    .body
    .copyWith(height: tight ? 1.6 : 1.625, color: context.colors.bodyInk);

/// A `.meta` line (13 px) sized as CSS sizes it (see [CssLineBox]).
Widget metaLines(Widget text, {double height = 1.4}) =>
    CssLineBox(fontSize: 13, height: height, child: text);

/// `.meta` in `mute`.
TextStyle signInMeta(BuildContext context, {double height = 1.4}) =>
    ShootType.meta.copyWith(height: height, color: context.colors.mute);

/// A label above a control (`gap: 6`).
class LabelledField extends StatelessWidget {
  const LabelledField({
    super.key,
    required this.label,
    required this.child,
    this.below,
  });

  final String label;
  final Widget child;
  final Widget? below;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 6,
      children: [
        ExcludeSemantics(
          child: CssLineBox(
            fontSize: 13,
            height: 1.4,
            child: Text(label, style: signInMeta(context)),
          ),
        ),
        child,
        ?below,
      ],
    );
  }
}

/// The channel's name ("SMS", "WhatsApp").
String channelName(BuildContext context, OtpChannel channel) =>
    switch (channel) {
      OtpChannel.sms => context.l10n.channelSms,
      OtpChannel.whatsapp => context.l10n.channelWhatsapp,
    };

/// Names from the CMS joined with the language's "or" (two persona names: "a or b"). English
/// sentences take them in lower case, as on board 21; Arabic has no case.
String personaList(BuildContext context, List<Persona> personas) {
  final l10n = context.l10n;
  final english = Localizations.localeOf(context).languageCode == 'en';
  final names = [
    for (final p in personas) english ? p.singular.toLowerCase() : p.singular,
  ];
  if (names.length < 2) return names.join();
  return l10n.listOr(
    names.sublist(0, names.length - 1).join(l10n.listSeparator),
    names.last,
  );
}

/// The words for a problem code from the flow (a field's or the failure's), or `null`.
String? flowMessage(
  BuildContext context,
  SignInFlowState state, {
  String? code,
}) {
  final l10n = context.l10n;
  final key =
      code ??
      state.fieldError ??
      switch (state.failure) {
        ServerFailure(:final code) => code,
        _ => null,
      };
  final known = ProblemCode.fromWire(key);
  if (known != null) {
    return known.message(
      l10n,
      retryAfter: state.retryAfter,
      otherChannel: channelName(context, state.channel.other),
    );
  }
  return state.failure?.message(l10n);
}

/// `/login/code?next=…`: keeps where the person was going while they move between screens.
String withNext(BuildContext context, String path) {
  final next = GoRouterState.of(context).uri.queryParameters['next'];
  return next == null ? path : '$path?next=${Uri.encodeComponent(next)}';
}

/// The bottom part of a sign-in form (`margin-top: auto` on the boards): the content above
/// scrolls when it does not fit (large text), and [bottom] stays at the foot.
class SignInForm extends StatelessWidget {
  const SignInForm({super.key, required this.items, required this.bottom});

  /// The form's items, `gap: 20`.
  final List<Widget> items;
  final Widget bottom;

  @override
  Widget build(BuildContext context) {
    // The items scroll as a list; the bottom fills what is left, so it sits at the foot when
    // everything fits and follows the items when it does not (large text). No intrinsic sizing
    // of the items (the code cells lay out from their width).
    return CustomScrollView(
      slivers: [
        SliverPadding(
          padding: const EdgeInsetsDirectional.fromSTEB(20, 24, 20, 0),
          sliver: SliverList.list(
            children: [
              for (var i = 0; i < items.length; i++) ...[
                if (i > 0) const SizedBox(height: ShootSpace.s5),
                items[i],
              ],
            ],
          ),
        ),
        SliverFillRemaining(
          hasScrollBody: false,
          child: Padding(
            padding: const EdgeInsetsDirectional.symmetric(horizontal: 20),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.end,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: ShootSpace.s5),
                bottom,
              ],
            ),
          ),
        ),
      ],
    );
  }
}
