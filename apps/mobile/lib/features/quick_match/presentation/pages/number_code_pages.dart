import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/l10n/failure_message.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/web/website_links.dart';
import 'package:shoot_mobile/core/widgets/inline_error.dart';
import 'package:shoot_mobile/core/widgets/linked_text.dart';
import 'package:shoot_mobile/core/widgets/message_banner.dart';
import 'package:shoot_mobile/core/widgets/money.dart';
import 'package:shoot_mobile/core/widgets/otp_code_input.dart';
import 'package:shoot_mobile/core/widgets/phone_field.dart';
import 'package:shoot_mobile/core/widgets/segmented_control.dart';
import 'package:shoot_mobile/core/widgets/shoot_field.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';
import 'package:shoot_mobile/core/widgets/shoot_scaffold.dart';
import 'package:shoot_mobile/core/widgets/summary_row.dart';
import 'package:shoot_mobile/core/widgets/top_hit.dart';
import 'package:shoot_mobile/features/quick_match/presentation/cubit/book_flow_cubit.dart';
import 'package:shoot_mobile/features/quick_match/presentation/cubit/match_cubit.dart';
import 'package:shoot_mobile/features/quick_match/presentation/pages/details_page.dart';
import 'package:shoot_mobile/features/quick_match/presentation/widgets/qm_parts.dart';
import 'package:shoot_mobile/features/sign_in/domain/entities/otp_challenge.dart';
import 'package:shoot_mobile/features/sign_in/domain/uae_mobile.dart';
import 'package:shoot_mobile/features/sign_in/presentation/widgets/sign_in_parts.dart';

/// The words for a failure while sending or checking a code, from the code's problem.
String? _codeMessage(BuildContext context, BookFlowState state) {
  final failure = state.failure;
  if (failure == null) return null;
  final l10n = context.l10n;
  if (failure is ServerFailure) {
    final known = ProblemCode.fromWire(failure.code);
    if (known != null) {
      return known.message(
        l10n,
        retryAfter: failure.retryAfter,
        otherChannel: channelName(context, state.channel.other),
      );
    }
  }
  return failure.message(l10n);
}

/// The booking summary on screens 10 and 11 (`.sum`): who, when and the price.
class _Summary extends StatelessWidget {
  const _Summary();

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final match = context.watch<MatchCubit>().state;
    final flow = context.watch<BookFlowCubit>().state;
    final first = match.chosenIn(0);
    final total = match.page?.totalFils;
    final when = [
      if (flow.date.isNotEmpty) qmDay(context, flow.date),
      if (flow.startTime.isNotEmpty) flow.startTime,
    ].join(' · ');
    return Column(
      children: [
        SummaryRow(
          label: l10n.qmSummaryCreator,
          value: first?.card.name ?? l10n.qmWeChoose,
        ),
        SummaryRow(label: l10n.qmSummaryWhen, value: when),
        if (total != null)
          SummaryRow(
            label: l10n.qmSummaryTotal,
            value: Money.format(total / 100),
          ),
      ],
    );
  }
}

/// Screen 10, built to board `S03b-signin-number`: the number, asked only now, after the brief.
class QmNumberPage extends StatefulWidget {
  const QmNumberPage({
    super.key,
    required this.ref,
    required this.accessKey,
    this.openUrl = openInBrowser,
  });

  final String ref;
  final String accessKey;
  final UrlOpener openUrl;

  @override
  State<QmNumberPage> createState() => _QmNumberPageState();
}

class _QmNumberPageState extends State<QmNumberPage> {
  late final BookFlowCubit _flow = context.read<BookFlowCubit>();
  late final TextEditingController _phone = TextEditingController(
    text: _flow.state.phone,
  );

  @override
  void dispose() {
    _phone.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return BookFlowListener(
      ref: widget.ref,
      accessKey: widget.accessKey,
      openUrl: widget.openUrl,
      child: BlocListener<BookFlowCubit, BookFlowState>(
        listenWhen: (a, b) =>
            a.status == BookStatus.sending &&
            b.status == BookStatus.awaitingCode,
        listener: (context, _) => unawaited(
          context.push('/match/${widget.ref}/${widget.accessKey}/code'),
        ),
        child: BlocBuilder<BookFlowCubit, BookFlowState>(
          builder: (context, state) {
            final first = context.watch<MatchCubit>().state.chosenIn(0);
            final phoneError =
                state.failure is ServerFailure &&
                ((state.failure! as ServerFailure).fieldCode('body.phone') ==
                        'auth.errors.phoneInvalid' ||
                    (state.failure! as ServerFailure).code ==
                        'auth.errors.phoneInvalid');
            final banner = switch (state.status) {
              BookStatus.rateLimited ||
              BookStatus.sendFailed ||
              BookStatus.failed => _codeMessage(context, state),
              _ => null,
            };
            return ShootScaffold(
              child: Column(
                children: [
                  QmHeader(onBack: () => qmBack(context)),
                  Expanded(
                    child: SignInForm(
                      items: [
                        SignInTitle(
                          title: l10n.qmNumberTitle,
                          body: Text(
                            first == null
                                ? l10n.qmNumberBodyTeam
                                : l10n.qmNumberBody(first.firstName),
                            style: signInBody(context),
                          ),
                        ),
                        const _Summary(),
                        LabelledField(
                          label: l10n.phoneLabel,
                          below: phoneError
                              ? InlineError(l10n.problemPhoneInvalid)
                              : metaLines(
                                  Text(
                                    l10n.phoneHint,
                                    style: signInMeta(context),
                                  ),
                                ),
                          child: PhoneField(
                            key: const ValueKey('qm:phone'),
                            label: l10n.phoneLabel,
                            countryCode: '+971',
                            countryCodeLabel: l10n.phoneCountryCodeLabel,
                            hint: l10n.phonePlaceholder,
                            controller: _phone,
                            error: phoneError,
                            onChanged: _flow.phoneChanged,
                            onSubmitted: (_) => unawaited(_flow.sendCode()),
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
                            onChanged: _flow.channelChanged,
                          ),
                        ),
                        if (banner != null)
                          MessageBanner(text: banner, tone: BannerTone.error),
                      ],
                      bottom: Padding(
                        padding: const EdgeInsetsDirectional.only(bottom: 18),
                        child: TopHit(
                          label: l10n.sendCodeAction,
                          centered: true,
                          loading: state.status == BookStatus.sending,
                          onPressed: () => unawaited(_flow.sendCode()),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

/// Screen 11, built to board `S03c-signin-code`: the code and, optionally, a name; one tap
/// ("Open WhatsApp") verifies, signs in, saves the booking and opens the chat.
class QmCodePage extends StatefulWidget {
  const QmCodePage({
    super.key,
    required this.ref,
    required this.accessKey,
    this.openUrl = openInBrowser,
  });

  final String ref;
  final String accessKey;
  final UrlOpener openUrl;

  @override
  State<QmCodePage> createState() => _QmCodePageState();
}

class _QmCodePageState extends State<QmCodePage> {
  late final BookFlowCubit _flow;
  late final TextEditingController _code;
  late final TextEditingController _name;
  final FocusNode _focus = FocusNode();
  Timer? _ticker;
  (String, bool)? _shown;

  @override
  void initState() {
    super.initState();
    _flow = context.read<BookFlowCubit>();
    _code = TextEditingController(text: _flow.state.code);
    _name = TextEditingController(text: _flow.state.name);
    _ticker = Timer.periodic(const Duration(milliseconds: 250), (_) {
      final timer = _flow.timer;
      if (!mounted || timer == null) return;
      final shown = (timer.label, timer.canResend);
      if (shown != _shown) setState(() => _shown = shown);
    });
  }

  @override
  void dispose() {
    _ticker?.cancel();
    _code.dispose();
    _name.dispose();
    _focus.dispose();
    super.dispose();
  }

  void _open() {
    if (_code.text.length < 6) {
      _focus.requestFocus();
      return;
    }
    unawaited(_flow.submit(_code.text));
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    return BookFlowListener(
      ref: widget.ref,
      accessKey: widget.accessKey,
      openUrl: widget.openUrl,
      child: BlocBuilder<BookFlowCubit, BookFlowState>(
        builder: (context, state) {
          final challenge = state.challenge;
          if (challenge == null) {
            // Only reachable from inside the flow (FR-046): back to the number.
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (mounted) {
                context.go('/match/${widget.ref}/${widget.accessKey}/number');
              }
            });
            return const ShootScaffold(child: SizedBox.shrink());
          }
          final timer = _flow.timer!;
          final refused = state.codeRefused;
          final meta = signInMeta(context);
          final first = context.watch<MatchCubit>().state.chosenIn(0);
          final banner = switch (state.status) {
            BookStatus.rateLimited ||
            BookStatus.sendFailed ||
            BookStatus.failed => _codeMessage(context, state),
            _ => null,
          };
          final time = '\u2066${timer.label}\u2069';
          return ShootScaffold(
            child: Column(
              children: [
                QmHeader(onBack: _flow.changeNumber),
                Expanded(
                  child: SignInForm(
                    items: [
                      SignInTitle(
                        title: l10n.codeTitle,
                        body: LinkedText(
                          '${l10n.codeSent(challenge.channel.name, '{phone}')} {change}',
                          style: signInBody(context),
                          parts: {
                            'phone': LinkedText.number(
                              displayUaeMobile(challenge.phone),
                            ),
                            'change': LinkedText.quiet(
                              l10n.changeNumberAction,
                              () {
                                _flow.changeNumber();
                                if (context.canPop()) context.pop();
                              },
                            ),
                          },
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        spacing: 12,
                        children: [
                          OtpCodeInput(
                            key: const ValueKey('qm:code'),
                            label: l10n.codeLabel,
                            controller: _code,
                            focusNode: _focus,
                            autofocus: true,
                            error: state.status == BookStatus.codeInvalid,
                            errorCount: state.errorCount,
                            onChanged: _flow.codeChanged,
                            onCompleted: (code) =>
                                unawaited(_flow.submit(code)),
                          ),
                          if (refused)
                            InlineError(_codeMessage(context, state) ?? ''),
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
                      ShootField(
                        key: const ValueKey('qm:name'),
                        label: first == null
                            ? l10n.qmNameLabelTeam
                            : l10n.qmNameLabel(first.firstName),
                        controller: _name,
                        autofillHints: const [AutofillHints.givenName],
                        textInputAction: TextInputAction.done,
                        onChanged: _flow.nameChanged,
                      ),
                      const _Summary(),
                    ],
                    bottom: Padding(
                      padding: const EdgeInsetsDirectional.only(bottom: 18),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        spacing: 10,
                        children: [
                          switch (state.status) {
                            BookStatus.codeInvalid => TopHit(
                              label: l10n.tryAgainAction,
                              centered: true,
                              onPressed: () {
                                _flow.tryAgain();
                                _code.clear();
                                _focus.requestFocus();
                              },
                            ),
                            BookStatus.codeExpired ||
                            BookStatus.codeLocked => TopHit(
                              label: l10n.askNewCodeAction,
                              centered: true,
                              onPressed: () => unawaited(_flow.resend()),
                            ),
                            _ => TopHit(
                              label: l10n.qmOpenWhatsApp,
                              leading: ShootIcons.whatsapp,
                              centered: true,
                              loading: state.busy,
                              onPressed: _open,
                            ),
                          },
                          if (timer.canResend && !refused)
                            metaLines(
                              LinkedText(
                                '{resend}',
                                textAlign: TextAlign.center,
                                style: meta,
                                parts: {
                                  'resend': LinkedText.quiet(
                                    l10n.codeResendNow,
                                    () => unawaited(_flow.resend()),
                                  ),
                                },
                              ),
                            ),
                          metaLines(
                            LinkedText(
                              l10n.codeOtherChannel('{link}'),
                              textAlign: TextAlign.center,
                              style: meta.copyWith(color: c.mute),
                              parts: {
                                'link': LinkedText.quiet(
                                  l10n.codeSendOn(state.channel.other.name),
                                  () =>
                                      unawaited(_flow.switchChannelAndResend()),
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
        },
      ),
    );
  }
}
