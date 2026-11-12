import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/routing/app_routes.dart';
import 'package:shoot_mobile/core/web/website_links.dart';
import 'package:shoot_mobile/core/widgets/check_line.dart';
import 'package:shoot_mobile/core/widgets/inline_error.dart';
import 'package:shoot_mobile/core/widgets/linked_text.dart';
import 'package:shoot_mobile/core/widgets/message_banner.dart';
import 'package:shoot_mobile/core/widgets/phone_field.dart';
import 'package:shoot_mobile/core/widgets/segmented_control.dart';
import 'package:shoot_mobile/core/widgets/shoot_scaffold.dart';
import 'package:shoot_mobile/core/widgets/text_link.dart';
import 'package:shoot_mobile/core/widgets/top_hit.dart';
import 'package:shoot_mobile/features/sign_in/domain/uae_mobile.dart';
import 'package:shoot_mobile/features/sign_in/presentation/cubit/sign_in_flow_cubit.dart';
import 'package:shoot_mobile/features/sign_in/presentation/widgets/sign_in_parts.dart';

/// Screen 23, built to board `S09c-join`: join as a creator. From the menu it sends a code first
/// (then screen 21 without the role question); in finish mode (from screen 21's "I'm a …") the
/// number is the one already sent to, read-only, and "Continue" verifies the kept code.
///
/// The professions are the active personas from the CMS (`GET personas`): one segment each, plus
/// "Both" or "All" choosing every one when there are two or more (OT-US4-S3).
class JoinPage extends StatefulWidget {
  const JoinPage({super.key, required this.links});

  final WebsiteLinks links;

  @override
  State<JoinPage> createState() => _JoinPageState();
}

class _JoinPageState extends State<JoinPage> {
  late final SignInFlowCubit _cubit = context.read<SignInFlowCubit>();
  late final TextEditingController _phone = TextEditingController(
    text: _cubit.state.finishMode
        ? displayUaeMobile(_cubit.state.challenge!.phone).substring(5)
        : _cubit.state.phone,
  );

  @override
  void initState() {
    super.initState();
    _cubit.startJoin();
  }

  @override
  void dispose() {
    _phone.dispose();
    super.dispose();
  }

  /// The legal documents open in the app (feature 015, FR-007).
  void _openLegal(String path) => unawaited(context.push<void>(path));

  void _back(SignInFlowState state) {
    if (state.finishMode) {
      _cubit.cancelFinish();
      context.go(withNext(context, AppRoutes.loginCode));
    } else {
      context.go(AppRoutes.home);
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<SignInFlowCubit, SignInFlowState>(
      listenWhen: (a, b) => a.status != b.status,
      listener: (context, state) {
        if (state.status == SignInStatus.awaitingCode &&
            !state.finishMode &&
            state.challenge != null) {
          context.go(withNext(context, AppRoutes.loginCode));
        } else if (state.finishMode && state.codeRefused) {
          context.go(withNext(context, AppRoutes.loginCode));
        }
      },
      builder: _build,
    );
  }

  Widget _build(BuildContext context, SignInFlowState state) {
    final l10n = context.l10n;
    final finish = state.finishMode;
    final meta = signInMeta(context);
    final personas = state.personas;
    final segments = <(String, String)>[
      for (final p in personas) (p.slug, p.singular),
    ];
    final selected = state.joinPersonas.isEmpty ? '' : state.joinPersonas.first;
    final error = state.fieldError;
    final personaError =
        error == 'auth.errors.personaRequired' ||
        error == 'auth.errors.personaInactive';
    final termsError = error == 'auth.errors.acceptTerms';
    final phoneError = error == 'auth.errors.phoneInvalid';
    final banner = switch (state.status) {
      SignInStatus.rateLimited ||
      SignInStatus.sendFailed ||
      SignInStatus.failed => flowMessage(context, state),
      _ => null,
    };
    final acceptTemplate = l10n.joinAccept(
      '{terms}',
      '{professional}',
      '{privacy}',
    );

    return ShootScaffold(
      child: Column(
        children: [
          SignInHeader(onBack: () => _back(state)),
          Expanded(
            child: SignInForm(
              items: [
                SignInTitle(
                  title: l10n.joinTitle,
                  tight: true,
                  body: Text(
                    l10n.joinBody,
                    style: signInBody(context, tight: true),
                  ),
                ),
                if (segments.isNotEmpty)
                  LabelledField(
                    label: l10n.joinIAm,
                    below: personaError
                        ? InlineError(flowMessage(context, state) ?? '')
                        : null,
                    child: SegmentedControl<String>(
                      key: const ValueKey('join:personas'),
                      segments: segments,
                      selected: selected,
                      onChanged: (value) => _cubit.joinPersonasChanged([value]),
                    ),
                  ),
                LabelledField(
                  label: l10n.phoneLabel,
                  below: phoneError
                      ? InlineError(l10n.problemPhoneInvalid)
                      : finish
                      ? Align(
                          alignment: AlignmentDirectional.centerStart,
                          child: TextLink(
                            label: l10n.changeNumberAction,
                            style: meta,
                            onTap: () {
                              _cubit.changeNumber();
                              context.go(withNext(context, AppRoutes.login));
                            },
                          ),
                        )
                      : metaLines(Text(l10n.phoneHint, style: meta)),
                  child: PhoneField(
                    key: const ValueKey('join:phone'),
                    label: l10n.phoneLabel,
                    countryCode: '+971',
                    countryCodeLabel: l10n.phoneCountryCodeLabel,
                    hint: l10n.phonePlaceholder,
                    controller: _phone,
                    readOnly: finish,
                    error: phoneError,
                    onChanged: _cubit.phoneChanged,
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  spacing: 8,
                  children: [
                    CheckLine(
                      key: const ValueKey('join:accept'),
                      template: acceptTemplate,
                      label: acceptTemplate
                          .replaceAll('{terms}', l10n.joinTermsLink)
                          .replaceAll(
                            '{professional}',
                            l10n.joinProfessionalLink,
                          )
                          .replaceAll('{privacy}', l10n.joinPrivacyLink),
                      checked: state.accepted,
                      error: termsError,
                      onChanged: _cubit.acceptChanged,
                      parts: {
                        'terms': LinkedText.link(
                          l10n.joinTermsLink,
                          () => _openLegal('/terms'),
                        ),
                        'professional': LinkedText.link(
                          l10n.joinProfessionalLink,
                          () => _openLegal('/terms/professional'),
                        ),
                        'privacy': LinkedText.link(
                          l10n.joinPrivacyLink,
                          () => _openLegal('/privacy'),
                        ),
                      },
                    ),
                    if (termsError) InlineError(l10n.problemAcceptTerms),
                  ],
                ),
                if (banner != null)
                  MessageBanner(text: banner, tone: BannerTone.error),
                TopHit(
                  label: finish ? l10n.continueAction : l10n.sendCodeAction,
                  centered: true,
                  loading: state.busy,
                  onPressed: () => unawaited(
                    finish ? _cubit.finishJoin() : _cubit.sendCode(),
                  ),
                ),
              ],
              bottom: Padding(
                padding: const EdgeInsetsDirectional.only(bottom: 18),
                child: metaLines(
                  LinkedText(
                    '${l10n.joinHaveAccount} {login}',
                    textAlign: TextAlign.center,
                    style: meta,
                    parts: {
                      'login': LinkedText.quiet(
                        l10n.joinLogIn,
                        () => context.go(withNext(context, AppRoutes.login)),
                      ),
                    },
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
