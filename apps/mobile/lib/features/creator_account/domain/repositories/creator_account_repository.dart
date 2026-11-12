import 'dart:typed_data';

import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/creator_account/domain/entities/creator_account.dart';

/// A file the creator chose (camera, library or files). The platform picker that makes these is
/// not part of this feature's build (it needs `image_picker` and `file_picker`, owner decision);
/// the app depends on this port and tests pass a fake.
final class PickedFile {
  const PickedFile({
    required this.name,
    required this.contentType,
    required this.bytes,
  });

  final String name;
  final String contentType;
  final Uint8List bytes;
}

enum PickSource { camera, library, files }

abstract interface class FilePicker {
  /// `null` when the person cancels. Throws [PickDenied] when access is refused.
  Future<PickedFile?> pick(PickSource source);
}

/// Camera or photo access was refused (the upload explains how to allow it).
final class PickDenied implements Exception {
  const PickDenied();
}

abstract interface class CreatorAccountRepository {
  Future<Result<CreatorAccount>> account();

  Future<Result<MyProfile>> profile();

  Future<Result<MyProfile>> saveProfile(Map<String, Object?> patch);

  Future<Result<MyProfile>> submit();

  Future<Result<MyProfile>> setHidden({required bool hidden});

  Future<Result<MyProfile>> uploadPhoto(PickedFile file);

  Future<Result<MyProfile>> addSample({
    required PickedFile file,
    required LocalText caption,
    String? specialty,
  });

  Future<Result<MyProfile>> removeSample(int index);

  Future<Result<MyProfile>> uploadIdentity(IdentityKind kind, PickedFile file);

  Future<Result<Availability>> availability();

  Future<Result<Availability>> setDay(DateTime day, {required bool blocked});

  Future<Result<CreatorBookings>> bookings();

  Future<Result<CreatorBookings>> answer(
    String ref, {
    required bool confirm,
    String? reason,
  });

  Future<Result<CreatorBookings>> deliver(String ref);

  Future<Result<CreatorBookings>> markUpdateRead(String id);
}
