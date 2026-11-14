import 'dart:async';
import 'dart:io' show Platform;

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

/// The platform side of app push (feature 019, research R7), so the rest of the app and its tests
/// never touch Firebase. A build without the Firebase config files simply has push off.
abstract interface class PushMessaging {
  /// Starts the push service; `false` when it is not available on this build or platform.
  Future<bool> start();

  /// The system permission prompt; `true` when notifications are allowed.
  Future<bool> requestPermission();

  /// This installation's push address, or `null` when there is none (yet).
  Future<String?> token();

  Stream<String> get tokenRefreshes;

  /// The `data` of a notification the person tapped while the app was running or in the background.
  Stream<Map<String, String>> get opened;

  /// The `data` of the notification that launched the app, once.
  Future<Map<String, String>?> initialOpen();

  /// `ios` or `android`, as the API names them.
  String get platform;
}

/// Push is off: web, desktop, tests, or a build without Firebase config.
final class NoPushMessaging implements PushMessaging {
  const NoPushMessaging();

  @override
  Future<bool> start() async => false;

  @override
  Future<bool> requestPermission() async => false;

  @override
  Future<String?> token() async => null;

  @override
  Stream<String> get tokenRefreshes => const Stream.empty();

  @override
  Stream<Map<String, String>> get opened => const Stream.empty();

  @override
  Future<Map<String, String>?> initialOpen() async => null;

  @override
  String get platform => 'android';
}

/// Firebase Cloud Messaging; iOS through FCM's APNs bridge.
final class FirebasePushMessaging implements PushMessaging {
  FirebasePushMessaging();

  FirebaseMessaging? _messaging;

  static Map<String, String> _data(RemoteMessage m) => {
    for (final e in m.data.entries) e.key: '${e.value}',
  };

  @override
  Future<bool> start() async {
    if (kIsWeb || !(Platform.isIOS || Platform.isAndroid)) return false;
    try {
      if (Firebase.apps.isEmpty) {
        await Firebase.initializeApp(options: firebaseOptionsFromEnvironment());
      }
      _messaging = FirebaseMessaging.instance;
      return true;
    } on Object {
      // No GoogleService-Info.plist / google-services.json in this build: push stays off.
      return false;
    }
  }

  @override
  Future<bool> requestPermission() async {
    final messaging = _messaging;
    if (messaging == null) return false;
    final settings = await messaging.requestPermission();
    return settings.authorizationStatus == AuthorizationStatus.authorized ||
        settings.authorizationStatus == AuthorizationStatus.provisional;
  }

  @override
  Future<String?> token() async {
    try {
      // The server sends with FCM HTTP v1 `message.token`, which takes this registration token;
      // `register()`/`onRegistered` give an installation id for direct-send, not used yet.
      // ignore: deprecated_member_use
      return await _messaging?.getToken();
    } on Object {
      return null;
    }
  }

  // See [token]: the registration token is what the server sends to.
  @override
  Stream<String> get tokenRefreshes =>
      // ignore: deprecated_member_use
      _messaging?.onTokenRefresh ?? const Stream.empty();

  @override
  Stream<Map<String, String>> get opened => _messaging == null
      ? const Stream.empty()
      : FirebaseMessaging.onMessageOpenedApp.map(_data);

  @override
  Future<Map<String, String>?> initialOpen() async {
    final m = await _messaging?.getInitialMessage();
    return m == null ? null : _data(m);
  }

  @override
  String get platform => Platform.isIOS ? 'ios' : 'android';
}

/// Firebase options from `--dart-define-from-file=firebase.env.json` (the owner's project, kept
/// out of git); `null` falls back to the native config files, and push stays off without either.
FirebaseOptions? firebaseOptionsFromEnvironment() {
  const project = String.fromEnvironment('FIREBASE_PROJECT_ID');
  const sender = String.fromEnvironment('FIREBASE_SENDER_ID');
  if (project.isEmpty || sender.isEmpty) return null;
  if (Platform.isIOS) {
    const key = String.fromEnvironment('FIREBASE_IOS_API_KEY');
    const app = String.fromEnvironment('FIREBASE_IOS_APP_ID');
    const bundle = String.fromEnvironment('FIREBASE_IOS_BUNDLE_ID');
    if (key.isEmpty || app.isEmpty) return null;
    return const FirebaseOptions(
      apiKey: key,
      appId: app,
      messagingSenderId: sender,
      projectId: project,
      iosBundleId: bundle,
    );
  }
  const key = String.fromEnvironment('FIREBASE_ANDROID_API_KEY');
  const app = String.fromEnvironment('FIREBASE_ANDROID_APP_ID');
  if (key.isEmpty || app.isEmpty) return null;
  return const FirebaseOptions(
    apiKey: key,
    appId: app,
    messagingSenderId: sender,
    projectId: project,
  );
}
