import 'dart:async';

import 'package:shoot_mobile/core/auth/safe_next.dart';
import 'package:shoot_mobile/core/push/push_api.dart';
import 'package:shoot_mobile/core/push/push_messaging.dart';

/// Where the person stands with the permission ask (stored on the device).
abstract interface class PushAskStore {
  bool get asked;
  Future<void> markAsked();
}

/// App push (feature 019, US6): starts the platform service, asks for permission once with a
/// plain reason, registers this device for the signed-in member in the app's language, routes a
/// tapped notification to its page, and removes the device on sign-out. Never throws.
class PushService {
  PushService({
    required this._messaging,
    required this._api,
    required this._store,
    required this._signedIn,
    required this._language,
  });

  final PushMessaging _messaging;
  final PushApi _api;
  final PushAskStore _store;
  final bool Function() _signedIn;
  final String Function() _language;

  bool _available = false;
  bool _allowed = false;
  final _subscriptions = <StreamSubscription<Object?>>[];

  bool get available => _available;

  /// Whether to show the reason sheet now: push works here, the member is signed in and was
  /// never asked on this device (US6-S1).
  bool get shouldAsk => _available && !_store.asked && _signedIn();

  /// Starts the service and sends taps to [open] (a path checked by `safeNext`, BI-US4-S2).
  Future<void> start({required void Function(String path) open}) async {
    try {
      _available = await _messaging.start();
      if (!_available) return;
      void route(Map<String, String>? data) {
        final path = safeNext(data?['path']);
        if (path != null) open(path);
      }

      _subscriptions
        ..add(_messaging.opened.listen(route))
        ..add(_messaging.tokenRefreshes.listen((_) => unawaited(register())));
      route(await _messaging.initialOpen());
      if (_store.asked) {
        _allowed = true;
        await register();
      }
    } on Object {
      _available = false;
    }
  }

  /// The person said yes on the reason sheet: the system prompt, then registration (US6-S2).
  Future<bool> allow() async {
    await _store.markAsked();
    if (!_available) return false;
    try {
      _allowed = await _messaging.requestPermission();
    } on Object {
      _allowed = false;
    }
    if (_allowed) await register();
    return _allowed;
  }

  /// "Not now": never asked again on this device; nothing else changes.
  Future<void> decline() => _store.markAsked();

  /// Registers this device for the signed-in member in the current language (also after a token
  /// rotation, a sign-in or a language change).
  Future<void> register() async {
    if (!_available || !_allowed || !_signedIn()) return;
    try {
      final token = await _messaging.token();
      if (token == null) return;
      await _api.register(
        token: token,
        platform: _messaging.platform,
        locale: _language(),
      );
    } on Object {
      // Tried again on the next start, sign-in or token change.
    }
  }

  /// Before sign-out, while the token still works (US6-S2).
  Future<void> unregister() async {
    if (!_available) return;
    try {
      final token = await _messaging.token();
      if (token != null) await _api.remove(token);
    } on Object {
      // Signing out goes ahead regardless; the server forgets dead devices on its own.
    }
  }

  Future<void> dispose() async {
    for (final s in _subscriptions) {
      await s.cancel();
    }
  }
}
