import 'dart:async';

import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/usecase/use_case.dart';
import 'package:shoot_mobile/features/creators/domain/entities/creators.dart';
import 'package:shoot_mobile/features/creators/domain/usecases/creator_use_cases.dart';
import 'package:shoot_mobile/features/creators/domain/usecases/get_brief_context.dart';
import 'package:shoot_mobile/features/creators/presentation/cubit/load_state.dart';

/// A profile with the site's WhatsApp number (`null` when the site has none or could not be read).
final class ProfileData extends Equatable {
  const ProfileData({
    required this.profile,
    required this.whatsappNumber,
    this.own = false,
  });

  final CreatorProfile profile;
  final String? whatsappNumber;

  /// The signed-in creator is looking at their own profile: nothing to book or ask.
  final bool own;

  @override
  List<Object?> get props => [profile, whatsappNumber, own];
}

/// Upper case, letters and digits only: `sh-0087`, `SH 0087` and `SH0087` are one code.
String _bare(String code) =>
    code.toUpperCase().replaceAll(RegExp('[^A-Z0-9]'), '');

/// Screen 16 (MC-US1). A creator who is not listed is [LoadMissing] (screen 37).
class ProfileCubit extends Cubit<LoadState<ProfileData>> {
  ProfileCubit({
    required this._getProfile,
    required this._getWhatsappNumber,
    required this.code,
    this._myCode,
  }) : super(const LoadInProgress());

  final GetCreatorProfile _getProfile;
  final GetWhatsappNumber _getWhatsappNumber;

  /// The signed-in creator's own code, or `null` for anyone else.
  final Future<String?> Function()? _myCode;

  /// The code as the link carried it, in any spelling.
  final String code;

  Future<void> load() async {
    emit(const LoadInProgress());
    final profile = await _getProfile(code);
    switch (profile) {
      case Err(:final failure):
        emit(LoadState.of<ProfileData>(Err(failure)));
      case Ok(:final value):
        // The number only feeds one row; a failure there never hides the profile.
        final number = switch (await _getWhatsappNumber(const NoParams())) {
          Ok(:final value) => value,
          Err() => null,
        };
        emit(
          LoadDone(
            ProfileData(
              profile: value,
              whatsappNumber: number,
              own: await _isOwn(value),
            ),
          ),
        );
    }
  }

  /// Never fails the profile: when the own code cannot be read, the page is shown as to anyone.
  Future<bool> _isOwn(CreatorProfile profile) async {
    final read = _myCode;
    if (read == null) return false;
    try {
      final mine = await read();
      if (mine == null || _bare(mine).isEmpty) return false;
      return _bare(mine) == _bare(profile.code) ||
          _bare(mine) == _bare(profile.displayCode);
    } on Object {
      return false;
    }
  }
}
