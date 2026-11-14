import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shoot_mobile/core/push/push_api.dart';

/// The member's push switch on the menu (US6-S3).
final class PushSwitchState extends Equatable {
  const PushSwitchState({this.enabled, this.busy = false});

  /// `null` until read.
  final bool? enabled;
  final bool busy;

  @override
  List<Object?> get props => [enabled, busy];
}

class PushCubit extends Cubit<PushSwitchState> {
  PushCubit(this._api) : super(const PushSwitchState());

  final PushApi _api;

  Future<void> load() async {
    try {
      emit(PushSwitchState(enabled: await _api.enabled()));
    } on Object {
      emit(const PushSwitchState());
    }
  }

  Future<void> set({required bool enabled}) async {
    final before = state.enabled;
    if (state.busy) return;
    emit(PushSwitchState(enabled: enabled, busy: true));
    try {
      emit(PushSwitchState(enabled: await _api.setEnabled(enabled: enabled)));
    } on Object {
      emit(PushSwitchState(enabled: before));
    }
  }
}
