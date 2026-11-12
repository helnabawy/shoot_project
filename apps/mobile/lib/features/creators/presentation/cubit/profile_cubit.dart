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
  const ProfileData({required this.profile, required this.whatsappNumber});

  final CreatorProfile profile;
  final String? whatsappNumber;

  @override
  List<Object?> get props => [profile, whatsappNumber];
}

/// Screen 16 (MC-US1). A creator who is not listed is [LoadMissing] (screen 37).
class ProfileCubit extends Cubit<LoadState<ProfileData>> {
  ProfileCubit({
    required GetCreatorProfile getProfile,
    required GetWhatsappNumber getWhatsappNumber,
    required this.code,
  }) : _getProfile = getProfile,
       _getWhatsappNumber = getWhatsappNumber,
       super(const LoadInProgress());

  final GetCreatorProfile _getProfile;
  final GetWhatsappNumber _getWhatsappNumber;

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
        emit(LoadDone(ProfileData(profile: value, whatsappNumber: number)));
    }
  }
}
