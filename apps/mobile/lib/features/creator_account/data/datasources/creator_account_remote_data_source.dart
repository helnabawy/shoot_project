import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:shoot_mobile/core/error/exceptions.dart';
import 'package:shoot_mobile/core/network/api_get.dart';
import 'package:shoot_mobile/core/network/api_post.dart';
import 'package:shoot_mobile/core/network/api_send.dart';
import 'package:shoot_mobile/features/creator_account/data/models/creator_account_models.dart';
import 'package:shoot_mobile/features/creator_account/domain/entities/creator_account.dart';
import 'package:shoot_mobile/features/creator_account/domain/repositories/creator_account_repository.dart';

/// `/api/mobile/v1/me/creator/*`. Throws [NetworkException] or [ServerException] (through the api
/// helpers), or [FormatException] when an answer does not decode; never a Dio type.
abstract interface class CreatorAccountRemoteDataSource {
  Future<CreatorAccountModel> account();

  Future<MyProfileModel> profile();

  Future<MyProfileModel> saveProfile(Map<String, Object?> patch);

  Future<MyProfileModel> submit();

  Future<MyProfileModel> setHidden({required bool hidden});

  Future<MyProfileModel> uploadPhoto(PickedFile file);

  Future<MyProfileModel> addSample({
    required PickedFile file,
    required LocalText caption,
    String? specialty,
  });

  Future<MyProfileModel> removeSample(int index);

  Future<MyProfileModel> uploadIdentity(IdentityKind kind, PickedFile file);

  Future<AvailabilityModel> availability();

  Future<AvailabilityModel> setDay(DateTime day, {required bool blocked});

  Future<CreatorBookingsModel> bookings();

  Future<CreatorBookingsModel> answer(
    String ref, {
    required bool confirm,
    String? reason,
  });

  Future<CreatorBookingsModel> deliver(String ref);

  Future<CreatorBookingsModel> markUpdateRead(String id);
}

final class CreatorAccountRemoteDataSourceImpl
    implements CreatorAccountRemoteDataSource {
  const CreatorAccountRemoteDataSourceImpl(this._dio);

  final Dio _dio;

  static const _base = 'me/creator';

  Map<String, Object?> _upload(PickedFile file) => {
    'contentType': file.contentType,
    'filename': file.name,
    'data': base64Encode(file.bytes),
  };

  Future<MyProfileModel> _profile(Future<Map<String, Object?>> call) async =>
      MyProfileModel.fromJson(await call);

  Future<CreatorBookingsModel> _bookings(
    Future<Map<String, Object?>> call,
  ) async => CreatorBookingsModel.fromJson(await call);

  @override
  Future<CreatorAccountModel> account() async =>
      CreatorAccountModel.fromJson(await apiGet(_dio, '$_base/account'));

  @override
  Future<MyProfileModel> profile() => _profile(apiGet(_dio, '$_base/profile'));

  @override
  Future<MyProfileModel> saveProfile(Map<String, Object?> patch) =>
      _profile(apiSend(_dio, 'PATCH', '$_base/profile', body: patch));

  @override
  Future<MyProfileModel> submit() => _profile(
    apiPost(_dio, '$_base/profile/submit').then((a) => a.body ?? const {}),
  );

  @override
  Future<MyProfileModel> setHidden({required bool hidden}) => _profile(
    apiSend(_dio, 'PUT', '$_base/profile/visibility', body: {'hidden': hidden}),
  );

  @override
  Future<MyProfileModel> uploadPhoto(PickedFile file) => _profile(
    apiSend(_dio, 'PUT', '$_base/profile/photo', body: _upload(file)),
  );

  @override
  Future<MyProfileModel> addSample({
    required PickedFile file,
    required LocalText caption,
    String? specialty,
  }) => _profile(
    apiPost(
      _dio,
      '$_base/profile/samples',
      body: {
        'kind': 'image',
        'caption': caption.toJson(),
        'specialty': specialty,
        'file': _upload(file),
      },
    ).then((a) => a.body ?? const {}),
  );

  @override
  Future<MyProfileModel> removeSample(int index) =>
      _profile(apiSend(_dio, 'DELETE', '$_base/profile/samples/$index'));

  @override
  Future<MyProfileModel> uploadIdentity(IdentityKind kind, PickedFile file) =>
      _profile(
        apiSend(
          _dio,
          'PUT',
          '$_base/identity/${kind.wire}',
          body: _upload(file),
        ),
      );

  @override
  Future<AvailabilityModel> availability() async =>
      AvailabilityModel.fromJson(await apiGet(_dio, '$_base/availability'));

  @override
  Future<AvailabilityModel> setDay(
    DateTime day, {
    required bool blocked,
  }) async => AvailabilityModel.fromJson(
    await apiSend(
      _dio,
      'PUT',
      '$_base/availability/${dayString(day)}',
      body: {'blocked': blocked},
    ),
  );

  @override
  Future<CreatorBookingsModel> bookings() =>
      _bookings(apiGet(_dio, '$_base/bookings'));

  @override
  Future<CreatorBookingsModel> answer(
    String ref, {
    required bool confirm,
    String? reason,
  }) => _bookings(
    apiPost(
      _dio,
      '$_base/bookings/${Uri.encodeComponent(ref)}/answer',
      body: {
        'decision': confirm ? 'confirm' : 'decline',
        if (reason != null && reason.trim().isNotEmpty) 'reason': reason.trim(),
      },
    ).then((a) => a.body ?? const {}),
  );

  @override
  Future<CreatorBookingsModel> deliver(String ref) => _bookings(
    apiPost(
      _dio,
      '$_base/bookings/${Uri.encodeComponent(ref)}/deliver',
    ).then((a) => a.body ?? const {}),
  );

  @override
  Future<CreatorBookingsModel> markUpdateRead(String id) => _bookings(
    apiPost(
      _dio,
      '$_base/updates/${Uri.encodeComponent(id)}/read',
    ).then((a) => a.body ?? const {}),
  );
}
