import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/routing/app_routes.dart';
import 'package:shoot_mobile/core/widgets/inline_error.dart';
import 'package:shoot_mobile/core/widgets/linked_text.dart';
import 'package:shoot_mobile/core/widgets/message_banner.dart';
import 'package:shoot_mobile/core/widgets/phone_field.dart';
import 'package:shoot_mobile/core/widgets/segmented_control.dart';
import 'package:shoot_mobile/core/widgets/shoot_scaffold.dart';
import 'package:shoot_mobile/core/widgets/top_hit.dart';
import 'package:shoot_mobile/features/sign_in/domain/entities/otp_challenge.dart';
import 'package:shoot_mobile/features/sign_in/presentation/cubit/sign_in_flow_cubit.dart';
import 'package:shoot_mobile/features/sign_in/presentation/widgets/sign_in_parts.dart';

/// Screen 20, built to board `S09-signin-number`: the number, the channel and "Send code". There is
/// no email sign-in: team members sign in on the website's admin panel.
class NumberPage extends StatefulWidget {
  const NumberPage({super.key});

  @override
  State<NumberPage> createState() => _NumberPageState();
}

class _NumberPageState extends State<NumberPage> {
  late final TextEditingController _phone = TextEditingController(
    text: context.read<SignInFlowCubit>().state.phone,
  );

  @override
  void initState() {
    super.initState();
    context.read<SignInFlowCubit>().startSignIn();
  }

  @override
  void dispose() {
    _phone.dispose();
    super.dispose();
  }

  void _send() => unawaited(context.read<SignInFlowCubit>().sendCode());

  /// The legal documents open in the app (feature 015, FR-007).
  void _openLegal(String path) => unawaited(context.push<void>(path));

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final cubit = context.read<SignInFlowCubit>();
    return BlocListener<SignInFlowCubit, SignInFlowState>(
      listenWhen: (a, b) =>
          a.status == SignInStatus.sending &&
          b.status == SignInStatus.awaitingCode,
      listener: (context, _) =>
          context.go(withNext(context, AppRoutes.loginCode)),
      child: BlocBuilder<SignInFlowCubit, SignInFlowState>(
        builder: (context, state) {
          final phoneError = state.fieldError == 'auth.errors.phoneInvalid';
          final banner = switch (state.status) {
            SignInStatus.rateLimited ||
            SignInStatus.sendFailed ||
            SignInStatus.failed => flowMessage(context, state),
            _ => null,
          };
          final meta = signInMeta(context);
          return ShootScaffold(
            child: Column(
              children: [
                SignInHeader(onBack: () => context.go(AppRoutes.home)),
                Expanded(
                  child: SignInForm(
                    items: [
                      SignInTitle(
                        title: l10n.signInNumberTitle,
                        body: Text(
                          l10n.signInNumberBody,
                          style: signInBody(context),
                        ),
                      ),
                      LabelledField(
                        label: l10n.phoneLabel,
                        below: phoneError
                            ? InlineError(l10n.problemPhoneInvalid)
                            : metaLines(Text(l10n.phoneHint, style: meta)),
                        child: PhoneField(
                          key: const ValueKey('signIn:phone'),
                          label: l10n.phoneLabel,
                          countryCode: '+971',
                          countryCodeLabel: l10n.phoneCountryCodeLabel,
                          hint: l10n.phonePlaceholder,
                          controller: _phone,
                          error: phoneError,
                          onChanged: cubit.phoneChanged,
                          onSubmitted: (_) => _send(),
                        ),
                      ),
                      LabelledField(
                        label: l10n.channelLabel,
                        child: SegmentedControl<OtpChannel>(
                          segments: [
                            (OtpChannel.sms, l10n.channelSms),
                            (OtpChannel.whatsapp, l10n.channelWhatsapp),
                          ],
                          selected: state.channel,
                          onChanged: cubit.channelChanged,
                        ),
                      ),
                      if (banner != null)
                        MessageBanner(text: banner, tone: BannerTone.error),
                      TopHit(
                        label: l10n.sendCodeAction,
                        centered: true,
                        loading: state.status == SignInStatus.sending,
                        onPressed: _send,
                      ),
                      metaLines(
                        LinkedText(
                          l10n.signInLegal('{terms}', '{privacy}'),
                          style: signInMeta(context, height: 1.5),
                          parts: {
                            'terms': LinkedText.link(
                              l10n.legalTermsLink,
                              () => _openLegal('/terms'),
                            ),
                            'privacy': LinkedText.link(
                              l10n.legalPrivacyLink,
                              () => _openLegal('/privacy'),
                            ),
                          },
                        ),
                        height: 1.5,
                      ),
                    ],
                    bottom: const SizedBox(height: 18),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
