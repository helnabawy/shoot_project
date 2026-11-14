import 'package:shoot_mobile/core/error/api_result.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/creator_account/data/datasources/inbox_remote_data_source.dart';
import 'package:shoot_mobile/features/creator_account/domain/entities/inbox.dart';
import 'package:shoot_mobile/features/creator_account/domain/repositories/inbox_repository.dart';

final class InboxRepositoryImpl implements InboxRepository {
  const InboxRepositoryImpl(this._remote);

  final InboxRemoteDataSource _remote;

  @override
  Future<Result<CreatorInbox>> inbox() =>
      apiResult(() async => (await _remote.inbox()).toEntity());

  @override
  Future<Result<CreatorInbox>> accept(BriefItem item) => apiResult(
    () async => (await _remote.answer(
      item.ref,
      persona: item.persona,
      accept: true,
    )).toEntity(),
  );

  @override
  Future<Result<CreatorInbox>> reject(
    BriefItem item, {
    String? reason,
    String? note,
  }) => apiResult(
    () async => (await _remote.answer(
      item.ref,
      persona: item.persona,
      accept: false,
      reason: reason,
      note: note,
    )).toEntity(),
  );

  @override
  Future<Result<CreatorInbox>> withdraw(BriefItem item) => apiResult(
    () async =>
        (await _remote.withdraw(item.ref, persona: item.persona)).toEntity(),
  );
}
