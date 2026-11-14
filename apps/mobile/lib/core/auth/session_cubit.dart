import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shoot_mobile/core/auth/auth_api.dart';
import 'package:shoot_mobile/core/auth/session.dart';
import 'package:shoot_mobile/core/auth/session_store.dart';
import 'package:shoot_mobile/core/error/exceptions.dart';
import 'package:shoot_mobile/core/time/clock.dart';

/// Whether someone is signed in (data-model "App: SessionState").
sealed class SessionState extends Equatable {
  const SessionState();

  @override
  List<Object?> get props => [];
}

/// Before the store is read. Never painted: `main()` reads the store before `runApp`.
final class SessionUnknown extends SessionState {
  const SessionUnknown();
}

final class SignedOut extends SessionState {
  const SignedOut();
}

final class SignedIn extends SessionState {
  const SignedIn(this.session);

  final Session session;

  SessionUser get user => session.user;

  @override
  List<Object?> get props => [session];
}

/// The app's session (research R14). One instance for the app (get_it); the auth interceptor
/// reads its token and the router's guard listens to it.
class SessionCubit extends Cubit<SessionState> {
  SessionCubit({
    required this._store,
    required this._api,
    required this._clock,
    Session? restored,
    bool storeRead = false,
  }) : super(_initial(restored, _clock, storeRead: storeRead));

  final SessionStore _store;
  final AuthApi _api;
  final Clock _clock;

  /// `main()` reads the store before `runApp` and passes what it found as [restored] with
  /// `storeRead: true`, so the first frame is already right (no signed-out flash).
  static SessionState _initial(
    Session? restored,
    Clock clock, {
    required bool storeRead,
  }) {
    if (restored == null) {
      return storeRead ? const SignedOut() : const SessionUnknown();
    }
    return restored.exp.isAfter(clock.now())
        ? SignedIn(restored)
        : const SignedOut();
  }

  /// The token to send, or `null` when signed out.
  String? get token => switch (state) {
    SignedIn(:final session) => session.token,
    _ => null,
  };

  /// Reads the store (when [SessionCubit] was not given a restored session) and emits
  /// [SignedIn] or [SignedOut] before any network call; then refreshes the user from `GET me`
  /// in the background. A 401 there signs out (OT-US3-S1).
  Future<void> restore() async {
    if (state is SessionUnknown) {
      final saved = await _store.read();
      if (saved == null || !saved.exp.isAfter(_clock.now())) {
        if (saved != null) await _store.clear();
        emit(const SignedOut());
        return;
      }
      emit(SignedIn(saved));
    } else if (state is SignedOut) {
      // An expired restored session.
      await _store.clear();
      return;
    }
    await refreshUser();
  }

  /// `GET me`: updates the signed-in user; a 401 signs out; a network error keeps what we have.
  Future<void> refreshUser() async {
    final current = state;
    if (current is! SignedIn) return;
    try {
      final user = await _api.me(current.session.token);
      final now = state;
      if (now is SignedIn && now.session.token == current.session.token) {
        final updated = now.session.copyWith(user: user);
        await _store.write(updated);
        emit(SignedIn(updated));
      }
    } on ServerException catch (e) {
      if (e.statusCode == 401) await expire();
    } on Object {
      // Offline or an unreadable answer: keep the stored user.
    }
  }

  /// After a correct code (feature 009 sign-in flow).
  Future<void> signIn(Session session) async {
    await _store.write(session);
    emit(SignedIn(session));
  }

  /// A refreshed token for the same session (the auth interceptor).
  Future<void> updateToken(RefreshedToken refreshed) async {
    final current = state;
    if (current is! SignedIn) return;
    final updated = current.session.copyWith(
      token: refreshed.token,
      exp: refreshed.exp,
    );
    await _store.write(updated);
    emit(SignedIn(updated));
  }

  /// The server no longer accepts the token (a 401): forget it locally.
  Future<void> expire() async {
    await _store.clear();
    emit(const SignedOut());
  }

  /// Runs before sign-out while the token still works (feature 019: remove this device's push
  /// registration). Set once at start-up; failures never stop the sign-out.
  Future<void> Function()? beforeSignOut;

  /// Ends the session on the server too (OT-US3-S3). Signs out locally whatever the server
  /// answers: a 401 means it is already over, and offline the token still expires.
  Future<void> signOut() async {
    final token = this.token;
    if (token != null) {
      try {
        await beforeSignOut?.call();
      } on Object {
        // Signed out regardless.
      }
      try {
        await _api.logout(token);
      } on Object {
        // Signed out locally regardless.
      }
    }
    await expire();
  }
}
