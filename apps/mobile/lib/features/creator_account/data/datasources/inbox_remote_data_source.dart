import 'package:dio/dio.dart';
import 'package:shoot_mobile/core/network/api_get.dart';
import 'package:shoot_mobile/core/network/api_post.dart';
import 'package:shoot_mobile/core/network/api_send.dart';
import 'package:shoot_mobile/features/creator_account/data/models/inbox_models.dart';

/// `/api/mobile/v1/me/creator/briefs…`. Throws through the api helpers; never a Dio type.
abstract interface class InboxRemoteDataSource {
  Future<CreatorInboxModel> inbox();

  Future<CreatorInboxModel> answer(
    String ref, {
    required String persona,
    required bool accept,
    String? reason,
    String? note,
  });

  Future<CreatorInboxModel> withdraw(String ref, {required String persona});
}

final class InboxRemoteDataSourceImpl implements InboxRemoteDataSource {
  const InboxRemoteDataSourceImpl(this._dio);

  final Dio _dio;

  static const _base = 'me/creator/briefs';

  String _answer(String ref) => '$_base/${Uri.encodeComponent(ref)}/answer';

  @override
  Future<CreatorInboxModel> inbox() async =>
      CreatorInboxModel.fromJson(await apiGet(_dio, _base));

  @override
  Future<CreatorInboxModel> answer(
    String ref, {
    required String persona,
    required bool accept,
    String? reason,
    String? note,
  }) async {
    final answer = await apiPost(
      _dio,
      _answer(ref),
      body: {
        'persona': persona,
        'decision': accept ? 'accept' : 'reject',
        if (!accept && reason != null && reason.isNotEmpty) 'reason': reason,
        if (!accept && note != null && note.trim().isNotEmpty)
          'note': note.trim(),
      },
    );
    return CreatorInboxModel.fromJson(answer.body ?? const {});
  }

  @override
  Future<CreatorInboxModel> withdraw(
    String ref, {
    required String persona,
  }) async => CreatorInboxModel.fromJson(
    await apiSend(
      _dio,
      'DELETE',
      '${_answer(ref)}?persona=${Uri.encodeQueryComponent(persona)}',
    ),
  );
}
