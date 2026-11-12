import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shoot_mobile/core/auth/session.dart';
import 'package:shoot_mobile/core/auth/session_cubit.dart';
import 'package:shoot_mobile/core/content/audience.dart';
import 'package:shoot_mobile/core/error/exceptions.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/time/clock.dart';
import 'package:shoot_mobile/features/sign_in/domain/entities/otp_challenge.dart';
import 'package:shoot_mobile/features/sign_in/domain/entities/signup_choice.dart';
import 'package:shoot_mobile/features/sign_in/domain/resend_timer.dart';
import 'package:shoot_mobile/features/sign_in/domain/usecases/request_code.dart';
import 'package:shoot_mobile/features/sign_in/domain/usecases/verify_code.dart';
import 'package:shoot_mobile/features/sign_in/presentation/cubit/sign_in_flow_state.dart';

export 'package:shoot_mobile/features/sign_in/presentation/cubit/sign_in_flow_state.dart';

/// The active personas, from `GET personas` (the site feature's repository).
typedef PersonasLoader = Future<Result<List<Persona>>> Function();

/// Screens 20–23 (research R12, R15). Provided once above `/login`, `/login/code` and
/// `/register`, so the number, channel and challenge survive moving between them. After a correct
/// code it signs the session in; the router then leaves the sign-in screens.
class SignInFlowCubit extends Cubit<SignInFlowState> {
  SignInFlowCubit({
    required this._requestCode,
    required this._verifyCode,
    required this._session,
    required this.clock,
    this._loadPersonas,
    SignInFlowState initial = const SignInFlowState(),
  }) : super(initial);

  final RequestCode _requestCode;
  final VerifyCode _verifyCode;
  final SessionCubit _session;
  final PersonasLoader? _loadPersonas;

  /// The countdowns' clock.
  final Clock clock;

  ResendTimer? get timer {
    final challenge = state.challenge;
    return challenge == null ? null : ResendTimer(challenge, clock);
  }

  /// Loads the active personas for the role rows and screen 23. A failure leaves them empty:
  /// the role question is skipped and the person signs in as a client.
  Future<void> loadPersonas() async {
    final load = _loadPersonas;
    if (load == null || state.personas.isNotEmpty) return;
    final result = await load();
    if (isClosed) return;
    if (result case Ok(:final value)) {
      emit(
        state.copyWith(
          personas: value,
          joinPersonas: state.joinPersonas.isEmpty && value.isNotEmpty
              ? [value.first.slug]
              : null,
        ),
      );
    }
  }

  void phoneChanged(String phone) => emit(
    state.copyWith(
      phone: phone,
      fieldError: () => null,
      status: state.challenge == null ? SignInStatus.editingNumber : null,
    ),
  );

  void channelChanged(OtpChannel channel) =>
      emit(state.copyWith(channel: channel));

  void roleChanged(AccountType role) => emit(state.copyWith(role: role));

  void joinPersonasChanged(List<String> slugs) =>
      emit(state.copyWith(joinPersonas: slugs, fieldError: () => null));

  void acceptChanged(bool accepted) =>
      emit(state.copyWith(accepted: accepted, fieldError: () => null));

  /// Opening screen 23 from the menu (no code yet) starts the join path; from screen 21's
  /// "I'm a …" it is already [SignInStatus.finishing].
  void startJoin() {
    if (state.status == SignInStatus.finishing) return;
    if (state.mode == SignInMode.join) return;
    emit(state.copyWith(mode: SignInMode.join));
  }

  /// Opening screen 20 ("Log in" from screen 23) is the standalone sign-in again.
  void startSignIn() {
    if (state.mode == SignInMode.signIn || state.challenge != null) return;
    emit(state.copyWith(mode: SignInMode.signIn, fieldError: () => null));
  }

  /// Back to the number: the challenge and code are dropped.
  void changeNumber() => emit(
    state.copyWith(
      status: SignInStatus.editingNumber,
      challenge: () => null,
      code: '',
      failure: () => null,
      fieldError: () => null,
    ),
  );

  /// "Send code" on screen 20, or on screen 23 from the menu.
  Future<void> sendCode() async {
    if (state.busy) return;
    if (state.mode == SignInMode.join && !_joinChoicesOk()) return;
    await _request(state.channel);
  }

  /// "Send a new code", or "Ask for a new code" after an expired or locked code.
  Future<void> resend() async {
    if (state.busy) return;
    if (!(timer?.canResend ?? true)) return;
    await _request(state.channel);
  }

  /// "send it on WhatsApp" / "by SMS": a new code by the other channel, only once the
  /// countdown has ended; before that the call is ignored (OT-US1-S8).
  Future<void> switchChannelAndResend() async {
    if (state.busy) return;
    if (!(timer?.canResend ?? false)) return;
    await _request(state.channel.other);
  }

  Future<void> _request(OtpChannel channel) async {
    emit(
      state.copyWith(
        status: SignInStatus.sending,
        channel: channel,
        failure: () => null,
        fieldError: () => null,
      ),
    );
    final result = await _requestCode((phone: state.phone, channel: channel));
    if (isClosed) return;
    switch (result) {
      case Ok(:final value):
        emit(
          state.copyWith(
            status: SignInStatus.awaitingCode,
            challenge: () => value,
            channel: value.channel,
            code: '',
          ),
        );
      case Err(:final failure):
        _fail(failure);
    }
  }

  void codeChanged(String code) {
    if (code == state.code) return;
    emit(
      state.copyWith(
        code: code,
        status: state.codeRefused && code.isNotEmpty
            ? SignInStatus.awaitingCode
            : null,
      ),
    );
  }

  /// Continue on screen 21 (or six digits typed). "I'm a …" does not verify: screen 23 finishes
  /// with the code kept (OT-US4-S2).
  Future<void> submitCode([String? code]) async {
    final typed = code ?? state.code;
    if (state.busy || state.challenge == null) return;
    if (typed != state.code) emit(state.copyWith(code: typed));
    if (state.asksRole && state.role == AccountType.provider) {
      emit(state.copyWith(status: SignInStatus.finishing));
      return;
    }
    await _verify(state.mode == SignInMode.join ? _providerSignup() : null);
  }

  /// Continue on screen 23 in finish mode: verifies once, with the creator sign-up.
  Future<void> finishJoin() async {
    if (state.busy || state.challenge == null) return;
    if (!_joinChoicesOk()) return;
    await _verify(_providerSignup());
  }

  /// Leaving screen 23's finish mode without continuing: back to the code screen.
  void cancelFinish() {
    if (state.status != SignInStatus.finishing) return;
    emit(
      state.copyWith(
        status: SignInStatus.awaitingCode,
        role: AccountType.seeker,
      ),
    );
  }

  /// "Try again" on screen 22: clears the cells.
  void tryAgain() => emit(
    state.copyWith(
      status: SignInStatus.awaitingCode,
      code: '',
      failure: () => null,
    ),
  );

  bool _joinChoicesOk() {
    String? error;
    if (state.joinPersonas.isEmpty) {
      error = 'auth.errors.personaRequired';
    } else if (!state.accepted) {
      error = 'auth.errors.acceptTerms';
    }
    if (error != null) emit(state.copyWith(fieldError: () => error));
    return error == null;
  }

  SignupChoice _providerSignup() => SignupChoice.provider(
    personas: state.joinPersonas,
    acceptTerms: state.accepted,
  );

  Future<void> _verify(SignupChoice? signup) async {
    final challenge = state.challenge!;
    emit(
      state.copyWith(
        status: SignInStatus.verifying,
        failure: () => null,
        fieldError: () => null,
      ),
    );
    final result = await _verifyCode((
      challenge: challenge,
      code: state.code,
      signup: signup,
    ));
    if (isClosed) return;
    switch (result) {
      case Ok(:final value):
        await _session.signIn(value.session);
        if (isClosed) return;
        emit(
          state.copyWith(
            status: SignInStatus.signedIn,
            isNew: value.isNew,
            code: '',
          ),
        );
      case Err(:final failure):
        _fail(failure);
    }
  }

  void _fail(Failure failure) {
    final code = failure is ServerFailure ? failure.code : null;
    final fields = failure is ServerFailure
        ? failure.fields
        : const <FieldProblem>[];
    final fieldCodes = {for (final f in fields) f.code};

    // Where the person is typing: the number before a challenge, the code after.
    final back = state.challenge == null
        ? SignInStatus.editingNumber
        : SignInStatus.awaitingCode;

    SignInFlowState next(SignInStatus status, {String? field}) =>
        state.copyWith(
          status: status,
          failure: () => failure,
          fieldError: () => field,
        );

    if (fieldCodes.contains('auth.errors.phoneInvalid') ||
        code == 'auth.errors.phoneInvalid') {
      emit(next(SignInStatus.editingNumber, field: 'auth.errors.phoneInvalid'));
      return;
    }
    for (final joinCode in const [
      'auth.errors.personaRequired',
      'auth.errors.personaInactive',
      'auth.errors.acceptTerms',
    ]) {
      if (code == joinCode || fieldCodes.contains(joinCode)) {
        emit(next(back, field: joinCode));
        return;
      }
    }
    final status = switch (code) {
      'auth.errors.codeInvalid' => SignInStatus.codeInvalid,
      'auth.errors.codeExpired' => SignInStatus.codeExpired,
      'auth.errors.codeLocked' => SignInStatus.codeLocked,
      'auth.errors.tooManyRequests' ||
      'auth.errors.resendTooSoon' ||
      'api.errors.rateLimited' => SignInStatus.rateLimited,
      'auth.errors.sendFailed' => SignInStatus.sendFailed,
      _ when fieldCodes.contains('auth.errors.codeInvalid') =>
        SignInStatus.codeInvalid,
      _ => SignInStatus.failed,
    };
    if (status == SignInStatus.codeInvalid) {
      emit(next(status).copyWith(errorCount: state.errorCount + 1));
      return;
    }
    emit(next(status));
  }
}
