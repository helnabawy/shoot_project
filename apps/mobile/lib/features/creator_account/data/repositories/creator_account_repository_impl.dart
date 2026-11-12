import 'package:shoot_mobile/core/error/api_result.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/creator_account/data/datasources/creator_account_remote_data_source.dart';
import 'package:shoot_mobile/features/creator_account/domain/entities/creator_account.dart';
import 'package:shoot_mobile/features/creator_account/domain/repositories/creator_account_repository.dart';

/// Turns datasource exceptions into failures (see `apiResult`).
final class CreatorAccountRepositoryImpl implements CreatorAccountRepository {
  const CreatorAccountRepositoryImpl(this._remote);

  final CreatorAccountRemoteDataSource _remote;

  @override
  Future<Result<CreatorAccount>> account() =>
      apiResult(() async => (await _remote.account()).toEntity());

  @override
  Future<Result<MyProfile>> profile() =>
      apiResult(() async => (await _remote.profile()).toEntity());

  @override
  Future<Result<MyProfile>> saveProfile(Map<String, Object?> patch) =>
      apiResult(() async => (await _remote.saveProfile(patch)).toEntity());

  @override
  Future<Result<MyProfile>> submit() =>
      apiResult(() async => (await _remote.submit()).toEntity());

  @override
  Future<Result<MyProfile>> setHidden({required bool hidden}) => apiResult(
    () async => (await _remote.setHidden(hidden: hidden)).toEntity(),
  );

  @override
  Future<Result<MyProfile>> uploadPhoto(PickedFile file) =>
      apiResult(() async => (await _remote.uploadPhoto(file)).toEntity());

  @override
  Future<Result<MyProfile>> addSample({
    required PickedFile file,
    required LocalText caption,
    String? specialty,
  }) => apiResult(
    () async => (await _remote.addSample(
      file: file,
      caption: caption,
      specialty: specialty,
    )).toEntity(),
  );

  @override
  Future<Result<MyProfile>> removeSample(int index) =>
      apiResult(() async => (await _remote.removeSample(index)).toEntity());

  @override
  Future<Result<MyProfile>> uploadIdentity(
    IdentityKind kind,
    PickedFile file,
  ) => apiResult(
    () async => (await _remote.uploadIdentity(kind, file)).toEntity(),
  );

  @override
  Future<Result<Availability>> availability() =>
      apiResult(() async => (await _remote.availability()).toEntity());

  @override
  Future<Result<Availability>> setDay(DateTime day, {required bool blocked}) =>
      apiResult(
        () async => (await _remote.setDay(day, blocked: blocked)).toEntity(),
      );

  @override
  Future<Result<CreatorBookings>> bookings() =>
      apiResult(() async => (await _remote.bookings()).toEntity());

  @override
  Future<Result<CreatorBookings>> answer(
    String ref, {
    required bool confirm,
    String? reason,
  }) => apiResult(
    () async => (await _remote.answer(
      ref,
      confirm: confirm,
      reason: reason,
    )).toEntity(),
  );

  @override
  Future<Result<CreatorBookings>> deliver(String ref) =>
      apiResult(() async => (await _remote.deliver(ref)).toEntity());

  @override
  Future<Result<CreatorBookings>> markUpdateRead(String id) =>
      apiResult(() async => (await _remote.markUpdateRead(id)).toEntity());
}
