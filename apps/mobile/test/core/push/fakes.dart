import 'dart:async';

import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/push/push_api.dart';
import 'package:shoot_mobile/core/push/push_messaging.dart';
import 'package:shoot_mobile/core/push/push_service.dart';

class MockPushApi extends Mock implements PushApi {}

final class FakeMessaging implements PushMessaging {
  FakeMessaging({this.available = true, this.allowed = true, this.initial});

  bool available;
  bool allowed;
  Map<String, String>? initial;
  String? currentToken = 'device-token-1';
  int asked = 0;
  final taps = StreamController<Map<String, String>>.broadcast();
  final refreshes = StreamController<String>.broadcast();

  @override
  Future<bool> start() async => available;

  @override
  Future<bool> requestPermission() async {
    asked += 1;
    return allowed;
  }

  @override
  Future<String?> token() async => currentToken;

  @override
  Stream<String> get tokenRefreshes => refreshes.stream;

  @override
  Stream<Map<String, String>> get opened => taps.stream;

  @override
  Future<Map<String, String>?> initialOpen() async => initial;

  @override
  String get platform => 'ios';
}

final class MemoryAskStore implements PushAskStore {
  MemoryAskStore({this.asked = false});

  @override
  bool asked;

  @override
  Future<void> markAsked() async => asked = true;
}

PushService service({
  required FakeMessaging messaging,
  required PushApi api,
  PushAskStore? store,
  bool signedIn = true,
  String language = 'en',
}) => PushService(
  messaging: messaging,
  api: api,
  store: store ?? MemoryAskStore(),
  signedIn: () => signedIn,
  language: () => language,
);
