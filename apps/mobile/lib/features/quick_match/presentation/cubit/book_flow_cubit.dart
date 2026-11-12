import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shoot_mobile/core/auth/session_cubit.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/time/clock.dart';
import 'package:shoot_mobile/features/quick_match/domain/entities/quick_match.dart';
import 'package:shoot_mobile/features/quick_match/domain/repositories/quick_match_repository.dart';
import 'package:shoot_mobile/features/sign_in/domain/entities/otp_challenge.dart';
import 'package:shoot_mobile/features/sign_in/domain/entities/signup_choice.dart';
import 'package:shoot_mobile/features/sign_in/domain/resend_timer.dart';
import 'package:shoot_mobile/features/sign_in/domain/usecases/request_code.dart';
import 'package:shoot_mobile/features/sign_in/domain/usecases/verify_code.dart';

/// Where steps 3 and 4 are (feature 012 US2).
enum BookStatus {
  editing,
  sending,
  awaitingCode,
  issuing,
  codeInvalid,
  codeExpired,
  codeLocked,
  rateLimited,
  sendFailed,

  /// A creator is no longer free (or the date passed): back to step 2.
  unavailable,
  failed,

  /// The quotation is saved; [BookFlowState.issued] has its link.
  done,
}

final class BookFlowState extends Equatable {
  const BookFlowState({
    this.status = BookStatus.editing,
    this.picks = const [],
    this.date = '',
    this.startTime = '',
    this.duration = '',
    this.venue = '',
    this.note = '',
    this.errors = const {},
    this.phone = '',
    this.channel = OtpChannel.sms,
    this.challenge,
    this.code = '',
    this.name = '',
    this.failure,
    this.errorCount = 0,
    this.issued,
  });

  final BookStatus status;
  final List<Pick> picks;

  /// Screen 09's details. Held in memory only, until the quotation is issued.
  final String date;
  final String startTime;
  final String duration;
  final String venue;
  final String note;

  /// A field's message key: `date`, `startTime`, `venue` (`booking.errors.*`).
  final Map<String, String> errors;
  final String phone;
  final OtpChannel channel;
  final OtpChallenge? challenge;
  final String code;

  /// What the creator should call the person (optional; used only for a new account).
  final String name;
  final Failure? failure;
  final int errorCount;
  final QuotationIssued? issued;

  bool get busy => status == BookStatus.sending || status == BookStatus.issuing;

  bool get codeRefused =>
      status == BookStatus.codeInvalid ||
      status == BookStatus.codeExpired ||
      status == BookStatus.codeLocked;

  BookingDetails get details => BookingDetails(
    date: date,
    startTime: startTime,
    duration: duration,
    venue: venue,
    note: note,
  );

  BookFlowState copyWith({
    BookStatus? status,
    List<Pick>? picks,
    String? date,
    String? startTime,
    String? duration,
    String? venue,
    String? note,
    Map<String, String>? errors,
    String? phone,
    OtpChannel? channel,
    OtpChallenge? Function()? challenge,
    String? code,
    String? name,
    Failure? Function()? failure,
    int? errorCount,
    QuotationIssued? issued,
  }) => BookFlowState(
    status: status ?? this.status,
    picks: picks ?? this.picks,
    date: date ?? this.date,
    startTime: startTime ?? this.startTime,
    duration: duration ?? this.duration,
    venue: venue ?? this.venue,
    note: note ?? this.note,
    errors: errors ?? this.errors,
    phone: phone ?? this.phone,
    channel: channel ?? this.channel,
    challenge: challenge == null ? this.challenge : challenge(),
    code: code ?? this.code,
    name: name ?? this.name,
    failure: failure == null ? this.failure : failure(),
    errorCount: errorCount ?? this.errorCount,
    issued: issued ?? this.issued,
  );

  @override
  List<Object?> get props => [
    status,
    picks,
    date,
    startTime,
    duration,
    venue,
    note,
    errors,
    phone,
    channel,
    challenge,
    code,
    name,
    failure,
    errorCount,
    issued,
  ];

  // Holds the typed number and code: never print them.
  @override
  bool get stringify => false;

  @override
  String toString() => 'BookFlowState($status)';
}

/// Steps 3 and 4 of Quick Match: the details (09), then, for a signed-out person, the number (10)
/// and the code (11), then one tap that verifies the code, signs in, saves the quotation and hands
/// back WhatsApp's address. The number and code rules are 009's (its use cases); this cubit adds
/// none (FR-013). A signed-in person skips 10 and 11 (FR-016).
final class BookFlowCubit extends Cubit<BookFlowState> {
  BookFlowCubit({
    required this._repository,
    required this._requestCode,
    required this._verifyCode,
    required this._session,
    required this.clock,
    required this.ref,
    required this.key,
  }) : super(const BookFlowState());

  final QuickMatchRepository _repository;
  final RequestCode _requestCode;
  final VerifyCode _verifyCode;
  final SessionCubit _session;
  final Clock clock;
  final String ref;
  final String key;

  static final _time = RegExp(r'^([01]\d|2[0-3]):[0-5]\d$');

  bool get signedIn => _session.state is SignedIn;

  ResendTimer? get timer {
    final challenge = state.challenge;
    return challenge == null ? null : ResendTimer(challenge, clock);
  }

  /// Dubai's calendar day now (UTC+4, no daylight saving).
  String get today => clock
      .now()
      .toUtc()
      .add(const Duration(hours: 4))
      .toIso8601String()
      .substring(0, 10);

  /// Carries the brief's choices over into step 3 (FR-010).
  void begin({
    required List<Pick> picks,
    required String date,
    required String duration,
  }) {
    if (state.picks == picks &&
        state.date == date &&
        state.duration == duration) {
      return;
    }
    emit(
      state.copyWith(
        picks: picks,
        date: date,
        duration: duration,
        errors: const {},
      ),
    );
  }

  void dateChanged(String date) => emit(
    state.copyWith(date: date, errors: {...state.errors}..remove('date')),
  );

  void durationChanged(String duration) =>
      emit(state.copyWith(duration: duration));

  void startTimeChanged(String time) => emit(
    state.copyWith(
      startTime: time,
      errors: {...state.errors}..remove('startTime'),
    ),
  );

  void venueChanged(String venue) => emit(
    state.copyWith(venue: venue, errors: {...state.errors}..remove('venue')),
  );

  void noteChanged(String note) => emit(state.copyWith(note: note));

  /// Screen 09's primary action: marks what is missing and sends nothing (US2-S4). `true` when
  /// the details are complete.
  bool validateDetails() {
    final errors = <String, String>{
      if (state.date.isEmpty || state.date.compareTo(today) < 0)
        'date': 'booking.errors.date',
      if (!_time.hasMatch(state.startTime))
        'startTime': 'booking.errors.startTime',
      if (state.venue.trim().isEmpty) 'venue': 'booking.errors.venue',
    };
    emit(state.copyWith(errors: errors));
    return errors.isEmpty;
  }

  /// 09's Continue for a signed-in person: validates, then issues the quotation in this one tap.
  Future<bool> continueSignedIn() async {
    if (!validateDetails()) return false;
    await issue();
    return true;
  }

  void phoneChanged(String phone) => emit(
    state.copyWith(
      phone: phone,
      failure: () => null,
      status: state.challenge == null ? BookStatus.editing : null,
    ),
  );

  void channelChanged(OtpChannel channel) =>
      emit(state.copyWith(channel: channel));

  void nameChanged(String name) => emit(state.copyWith(name: name));

  void codeChanged(String code) {
    if (code == state.code) return;
    emit(
      state.copyWith(
        code: code,
        status: state.codeRefused && code.isNotEmpty
            ? BookStatus.awaitingCode
            : null,
      ),
    );
  }

  /// Back to the number with it kept for editing (US2 edge case).
  void changeNumber() => emit(
    state.copyWith(
      status: BookStatus.editing,
      challenge: () => null,
      code: '',
      failure: () => null,
    ),
  );

  /// 10's "Send code".
  Future<void> sendCode() async {
    if (state.busy) return;
    await _request(state.channel);
  }

  Future<void> resend() async {
    if (state.busy || !(timer?.canResend ?? true)) return;
    await _request(state.channel);
  }

  Future<void> switchChannelAndResend() async {
    if (state.busy || !(timer?.canResend ?? false)) return;
    await _request(state.channel.other);
  }

  Future<void> _request(OtpChannel channel) async {
    emit(
      state.copyWith(
        status: BookStatus.sending,
        channel: channel,
        failure: () => null,
      ),
    );
    final result = await _requestCode((phone: state.phone, channel: channel));
    if (isClosed) return;
    switch (result) {
      case Ok(:final value):
        emit(
          state.copyWith(
            status: BookStatus.awaitingCode,
            challenge: () => value,
            channel: value.channel,
            code: '',
          ),
        );
      case Err(:final failure):
        _failCode(failure);
    }
  }

  /// 11's "Open WhatsApp": verifies the code, signs in, then saves the quotation. A wrong code
  /// saves nothing (US2-S9).
  Future<void> submit([String? typed]) async {
    final challenge = state.challenge;
    if (state.busy || challenge == null) return;
    final code = typed ?? state.code;
    emit(
      state.copyWith(
        code: code,
        status: BookStatus.issuing,
        failure: () => null,
      ),
    );
    final name = state.name.trim();
    final verified = await _verifyCode((
      challenge: challenge,
      code: code,
      signup: SignupChoice.seeker(name: name.length >= 2 ? name : null),
    ));
    if (isClosed) return;
    switch (verified) {
      case Ok(:final value):
        await _session.signIn(value.session);
        if (isClosed) return;
        await issue();
      case Err(:final failure):
        _failCode(failure);
    }
  }

  /// Saves the quotation for the signed-in person and the chosen creators (FR-015, FR-016).
  Future<void> issue() async {
    emit(state.copyWith(status: BookStatus.issuing, failure: () => null));
    final result = await _repository.issueQuotation(
      ref,
      key,
      state.picks,
      state.details,
    );
    if (isClosed) return;
    switch (result) {
      case Ok(:final value):
        emit(state.copyWith(status: BookStatus.done, issued: value));
      case Err(:final failure):
        _failIssue(failure);
    }
  }

  void tryAgain() => emit(
    state.copyWith(
      status: BookStatus.awaitingCode,
      code: '',
      failure: () => null,
    ),
  );

  void _failIssue(Failure failure) {
    final code = failure is ServerFailure ? failure.code : null;
    if (failure is ServerFailure) {
      final fields = <String, String>{
        for (final field in failure.fields)
          if (field.path.startsWith('body.details.'))
            field.path.substring('body.details.'.length): field.code,
      };
      if (fields.isNotEmpty) {
        emit(
          state.copyWith(
            status: BookStatus.editing,
            errors: fields,
            failure: () => failure,
          ),
        );
        return;
      }
    }
    final status = switch (code) {
      'booking.errors.unavailable' ||
      'booking.errors.creatorUnavailable' => BookStatus.unavailable,
      'api.errors.rateLimited' => BookStatus.rateLimited,
      _ => BookStatus.failed,
    };
    emit(state.copyWith(status: status, failure: () => failure));
  }

  void _failCode(Failure failure) {
    final code = failure is ServerFailure ? failure.code : null;
    final fieldCodes = failure is ServerFailure
        ? {for (final f in failure.fields) f.code}
        : const <String>{};
    final status = switch (code) {
      'auth.errors.codeInvalid' => BookStatus.codeInvalid,
      'auth.errors.codeExpired' => BookStatus.codeExpired,
      'auth.errors.codeLocked' => BookStatus.codeLocked,
      'auth.errors.tooManyRequests' ||
      'auth.errors.resendTooSoon' ||
      'api.errors.rateLimited' => BookStatus.rateLimited,
      'auth.errors.sendFailed' => BookStatus.sendFailed,
      _ when fieldCodes.contains('auth.errors.codeInvalid') =>
        BookStatus.codeInvalid,
      _
          when fieldCodes.contains('auth.errors.phoneInvalid') ||
              code == 'auth.errors.phoneInvalid' =>
        BookStatus.editing,
      _ => BookStatus.failed,
    };
    emit(
      state.copyWith(
        status: status,
        failure: () => failure,
        errorCount: status == BookStatus.codeInvalid
            ? state.errorCount + 1
            : null,
      ),
    );
  }
}
