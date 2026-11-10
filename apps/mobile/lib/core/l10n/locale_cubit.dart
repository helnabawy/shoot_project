import 'dart:ui';

import 'package:flutter_bloc/flutter_bloc.dart';

/// The language the person picked, or `null` to follow the device.
///
/// In memory only for now; persisting it comes with the mobile spec.
class LocaleCubit extends Cubit<Locale?> {
  LocaleCubit() : super(null);

  void select(Locale? locale) => emit(locale);
}
