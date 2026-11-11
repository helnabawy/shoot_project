/// The one source of "now" (feature 007). Code never calls `DateTime.now()` directly, so tests and
/// goldens run at a fixed time.
abstract interface class Clock {
  DateTime now();
}

/// The device clock.
final class SystemClock implements Clock {
  const SystemClock();

  @override
  DateTime now() => DateTime.now();
}

/// A clock stopped at [instant]; tests and goldens use it.
final class FixedClock implements Clock {
  const FixedClock(this.instant);

  final DateTime instant;

  @override
  DateTime now() => instant;
}
