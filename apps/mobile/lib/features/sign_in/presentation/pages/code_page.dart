import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/auth/session.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/routing/app_routes.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/widgets/choice_row_group.dart';
import 'package:shoot_mobile/core/widgets/group_label.dart';
import 'package:shoot_mobile/core/widgets/inline_error.dart';
import 'package:shoot_mobile/core/widgets/linked_text.dart';
import 'package:shoot_mobile/core/widgets/message_banner.dart';
import 'package:shoot_mobile/core/widgets/otp_code_input.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';
import 'package:shoot_mobile/core/widgets/shoot_scaffold.dart';
import 'package:shoot_mobile/core/widgets/top_hit.dart';
import 'package:shoot_mobile/features/sign_in/domain/resend_timer.dart';
import 'package:shoot_mobile/features/sign_in/domain/uae_mobile.dart';
import 'package:shoot_mobile/features/sign_in/presentation/cubit/sign_in_flow_cubit.dart';
import 'package:shoot_mobile/features/sign_in/presentation/widgets/sign_in_parts.dart';

/// Screens 21 and 22, built to boards `S09b-signin-code` and `S09d-code-error`: the six cells,
/// the countdown, the role question (standalone sign-in only) and Continue; a refused code shows
/// board 22's error cells and "Try again".
class CodePage extends StatefulWidget {
  const CodePage({super.key});

  @override
  State<CodePage> createState() => _CodePageState();
}

class _CodePageState extends State<CodePage> {
  late final SignInFlowCubit _cubit = context.read<SignInFlowCubit>();
  late final TextEditingController _code = TextEditingController(
    text: _cubit.state.code,
  );
  final FocusNode _focus = FocusNode();
  Timer? _ticker;
  (String, bool)? _shown;

  @override
  void initState() {
    super.initState();
    // The countdown repaints when its label changes (once a second on the device clock; never
    // on a stopped clock, so tests and goldens settle).
    _ticker = Timer.periodic(const Duration(milliseconds: 250), (_) {
      final challenge = _cubit.state.challenge;
      if (!mounted || challenge == null) return;
      final timer = ResendTimer(challenge, _cubit.clock);
      final shown = (timer.label, timer.canResend);
      if (shown != _shown) setState(() => _shown = shown);
    });
  }

  @override
  void dispose() {
    _ticker?.cancel();
    _code.dispose();
    _focus.dispose();
    super.dispose();
  }

  void _continue() {
    if (_code.text.length < 6) {
      _focus.requestFocus();
      return;
    }
    unawaited(_cubit.submitCode(_code.text));
  }

  void _tryAgain() {
    _cubit.tryAgain();
    _code.clear();
    _focus.requestFocus();
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<SignInFlowCubit, SignInFlowState>(
      listenWhen: (a, b) => a.status != b.status,
      listener: (context, state) {
        if (state.status == SignInStatus.finishing) {
          context.go(withNext(context, AppRoutes.register));
        } else if (state.status == SignInStatus.editingNumber) {
          context.go(withNext(context, AppRoutes.login));
        }
      },
      builder: _build,
    );
  }

  Widget _build(BuildContext context, SignInFlowState state) {
    final l10n = context.l10n;
    final c = context.colors;
    final challenge = state.challenge;
    if (challenge == null) return const ShootScaffold(child: SizedBox.shrink());
    final timer = ResendTimer(challenge, _cubit.clock);
    final refused = state.codeRefused;
    final tight = refused;
    final meta = signInMeta(context);
    final quiet13 = meta;
    final banner = switch (state.status) {
      SignInStatus.rateLimited ||
      SignInStatus.sendFailed ||
      SignInStatus.failed => flowMessage(context, state),
      _ => null,
    };
    final time = '\u2066${timer.label}\u2069';
    final otherChannel = state.channel.other.name;

    return ShootScaffold(
      child: Column(
        children: [
          SignInHeader(
            language: false,
            onBack: () {
              _cubit.changeNumber();
            },
          ),
          Expanded(
            child: SignInForm(
              items: [
                SignInTitle(
                  title: l10n.codeTitle,
                  tight: tight,
                  body: LinkedText(
                    '${l10n.codeSent(challenge.channel.name, '{phone}')} {change}',
                    style: signInBody(context, tight: tight),
                    parts: {
                      'phone': LinkedText.number(
                        displayUaeMobile(challenge.phone),
                      ),
                      'change': LinkedText.quiet(
                        l10n.changeNumberAction,
                        _cubit.changeNumber,
                      ),
                    },
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  spacing: 12,
                  children: [
                    OtpCodeInput(
                      key: const ValueKey('signIn:code'),
                      label: l10n.codeLabel,
                      controller: _code,
                      focusNode: _focus,
                      autofocus: true,
                      error: state.status == SignInStatus.codeInvalid,
                      errorCount: state.errorCount,
                      onChanged: _cubit.codeChanged,
                      onCompleted: (code) => unawaited(_cubit.submitCode(code)),
                    ),
                    if (refused) InlineError(flowMessage(context, state) ?? ''),
                    if (banner != null)
                      MessageBanner(text: banner, tone: BannerTone.error),
                    if (!timer.canResend)
                      metaLines(
                        Text(
                          refused
                              ? l10n.codeAskNewIn(time)
                              : l10n.codeResendIn(time),
                          style: ShootType.num(meta),
                        ),
                      ),
                  ],
                ),
                if (state.asksRole && !refused)
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    spacing: 8,
                    children: [
                      GroupLabel(
                        l10n.roleQuestion,
                        padding: const EdgeInsetsDirectional.only(bottom: 4),
                        // Board 21's `.gl` keeps the font's normal line height.
                        lineHeight: 13 / 11,
                      ),
                      ChoiceRowGroup<AccountType>(
                        label: l10n.roleGroupLabel,
                        selected: state.role,
                        onChanged: _cubit.roleChanged,
                        rows: [
                          (
                            value: AccountType.seeker,
                            label: l10n.roleSeeker(
                              personaList(context, state.personas),
                            ),
                            icon: ShootIcons.search,
                          ),
                          (
                            value: AccountType.provider,
                            label: l10n.roleProvider(
                              personaList(context, state.personas),
                            ),
                            icon: ShootIcons.person,
                          ),
                        ],
                      ),
                      metaLines(Text(l10n.roleReturning, style: meta)),
                    ],
                  ),
              ],
              bottom: Padding(
                padding: const EdgeInsetsDirectional.only(bottom: 18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  spacing: 10,
                  children: [
                    _topHit(context, state),
                    if (timer.canResend && !refused)
                      metaLines(
                        LinkedText(
                          '{resend}',
                          textAlign: TextAlign.center,
                          style: quiet13,
                          parts: {
                            'resend': LinkedText.quiet(
                              l10n.codeResendNow,
                              () => unawaited(_cubit.resend()),
                            ),
                          },
                        ),
                      ),
                    metaLines(
                      LinkedText(
                        refused
                            ? l10n.codeStillNothing('{link}')
                            : l10n.codeOtherChannel('{link}'),
                        textAlign: TextAlign.center,
                        style: meta.copyWith(color: c.mute),
                        parts: {
                          'link': LinkedText.quiet(
                            refused
                                ? l10n.codeSendOnStart(otherChannel)
                                : l10n.codeSendOn(otherChannel),
                            () => unawaited(_cubit.switchChannelAndResend()),
                          ),
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _topHit(BuildContext context, SignInFlowState state) {
    final l10n = context.l10n;
    return switch (state.status) {
      SignInStatus.codeInvalid => TopHit(
        label: l10n.tryAgainAction,
        centered: true,
        onPressed: _tryAgain,
      ),
      SignInStatus.codeExpired || SignInStatus.codeLocked => TopHit(
        label: l10n.askNewCodeAction,
        centered: true,
        onPressed: () => unawaited(_cubit.resend()),
      ),
      _ => TopHit(
        label: l10n.continueAction,
        centered: true,
        loading: state.busy,
        onPressed: _continue,
      ),
    };
  }
}
