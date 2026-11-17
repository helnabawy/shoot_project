import 'dart:async';

/// Feature 022 (research R9): keeps an open list live without a realtime service. While started,
/// it asks [read] for the list's fingerprint every [every] and calls [onChanged] only when the
/// fingerprint differs from the last one seen. A failed read is skipped and tried on the next tick.
class StampPoller {
  StampPoller({
    required this._read,
    required this._onChanged,
    this.every = const Duration(seconds: 3),
  });

  final Future<String?> Function() _read;
  final void Function() _onChanged;
  final Duration every;

  Timer? _timer;
  String? _known;
  bool _busy = false;

  bool get running => _timer != null;

  /// Starts polling from [known] (the fingerprint of what is shown now, if any).
  void start({String? known}) {
    _known = known ?? _known;
    _timer ??= Timer.periodic(every, (_) => _tick());
  }

  void stop() {
    _timer?.cancel();
    _timer = null;
  }

  Future<void> _tick() async {
    if (_busy) return;
    _busy = true;
    try {
      final next = await _read();
      if (next == null) return;
      if (_known == null) {
        _known = next;
      } else if (next != _known) {
        _known = next;
        _onChanged();
      }
    } on Object {
      // Tried again on the next tick.
    } finally {
      _busy = false;
    }
  }
}
