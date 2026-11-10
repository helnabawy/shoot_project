import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

/// Light, dark or follow the device (the default, as on the web).
///
/// In memory only for now; persisting the choice comes with the mobile spec
/// (it needs a storage package and a Complexity Tracking entry).
class ThemeModeCubit extends Cubit<ThemeMode> {
  ThemeModeCubit() : super(ThemeMode.system);

  void select(ThemeMode mode) => emit(mode);
}
