import 'package:equatable/equatable.dart';
import 'package:shoot_mobile/core/auth/session.dart';
import 'package:shoot_mobile/core/content/audience.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/features/sign_in/domain/entities/otp_challenge.dart';

/// Where the flow is (data-model "App: SignInFlowState").
enum SignInStatus {
  editingNumber,
  sending,
  awaitingCode,
  verifying,
  codeInvalid,
  codeExpired,
  codeLocked,
  rateLimited,
  sendFailed,

  /// Any other failure (offline, an editor's number, an unknown problem); see [SignInFlowState.failure].
  failed,

  /// "I'm a …" + Continue on screen 21: screen 23 finishes the sign-up with the code kept.
  finishing,
  signedIn,
}

/// The standalone sign-in (screens 20 → 21) or joining as a creator from the menu (23 → 21).
enum SignInMode { signIn, join }

/// Everything the three screens show. Nothing here is saved; the code stays in memory only.
final class SignInFlowState extends Equatable {
  const SignInFlowState({
    this.status = SignInStatus.editingNumber,
    this.mode = SignInMode.signIn,
    this.phone = '',
    this.channel = OtpChannel.sms,
    this.challenge,
    this.code = '',
    this.role = AccountType.seeker,
    this.personas = const [],
    this.joinPersonas = const [],
    this.accepted = false,
    this.fieldError,
    this.failure,
    this.errorCount = 0,
    this.isNew = false,
  });

  final SignInStatus status;
  final SignInMode mode;

  /// The number as typed.
  final String phone;
  final OtpChannel channel;
  final OtpChallenge? challenge;

  /// The typed code (memory only).
  final String code;

  /// Screen 21's role question; [AccountType.seeker] by default.
  final AccountType role;

  /// The active personas (`GET personas`), in site order, in the app's language.
  final List<Persona> personas;

  /// Screen 23's choice: persona slugs.
  final List<String> joinPersonas;
  final bool accepted;

  /// A field's problem code (`auth.errors.phoneInvalid`, `auth.errors.acceptTerms`, …).
  final String? fieldError;

  /// The last failure, for the banner and the rate-limit wait.
  final Failure? failure;

  /// Grows with each wrong code, so the cells shake once per mistake.
  final int errorCount;
  final bool isNew;

  /// The role question shows only on the standalone sign-in, and only when the personas loaded.
  bool get asksRole => mode == SignInMode.signIn && personas.isNotEmpty;

  /// Screen 23 finishing a sign-up whose code was already sent from screen 20 (OT-US4-S2):
  /// the number is read-only and the Top Hit verifies.
  bool get finishMode => mode == SignInMode.signIn && challenge != null;

  bool get busy =>
      status == SignInStatus.sending || status == SignInStatus.verifying;

  /// The code screen's error state (board 22) and its kin.
  bool get codeRefused =>
      status == SignInStatus.codeInvalid ||
      status == SignInStatus.codeExpired ||
      status == SignInStatus.codeLocked;

  /// A 429's wait in seconds.
  int? get retryAfter => switch (failure) {
    ServerFailure(:final retryAfter) => retryAfter,
    _ => null,
  };

  SignInFlowState copyWith({
    SignInStatus? status,
    SignInMode? mode,
    String? phone,
    OtpChannel? channel,
    OtpChallenge? Function()? challenge,
    String? code,
    AccountType? role,
    List<Persona>? personas,
    List<String>? joinPersonas,
    bool? accepted,
    String? Function()? fieldError,
    Failure? Function()? failure,
    int? errorCount,
    bool? isNew,
  }) {
    return SignInFlowState(
      status: status ?? this.status,
      mode: mode ?? this.mode,
      phone: phone ?? this.phone,
      channel: channel ?? this.channel,
      challenge: challenge != null ? challenge() : this.challenge,
      code: code ?? this.code,
      role: role ?? this.role,
      personas: personas ?? this.personas,
      joinPersonas: joinPersonas ?? this.joinPersonas,
      accepted: accepted ?? this.accepted,
      fieldError: fieldError != null ? fieldError() : this.fieldError,
      failure: failure != null ? failure() : this.failure,
      errorCount: errorCount ?? this.errorCount,
      isNew: isNew ?? this.isNew,
    );
  }

  @override
  List<Object?> get props => [
    status,
    mode,
    phone,
    channel,
    challenge,
    code,
    role,
    personas,
    joinPersonas,
    accepted,
    fieldError,
    failure,
    errorCount,
    isNew,
  ];

  // The state holds the typed number and code: never print them.
  @override
  bool get stringify => false;

  @override
  String toString() => 'SignInFlowState($status, $mode)';
}
