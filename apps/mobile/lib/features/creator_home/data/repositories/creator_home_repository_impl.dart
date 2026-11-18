import 'package:shoot_mobile/core/error/api_result.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/creator_account/data/datasources/creator_account_remote_data_source.dart';
import 'package:shoot_mobile/features/creator_account/data/datasources/inbox_remote_data_source.dart';
import 'package:shoot_mobile/features/creator_home/data/datasources/creator_home_remote_data_source.dart';
import 'package:shoot_mobile/features/creator_home/domain/entities/creator_home.dart';
import 'package:shoot_mobile/features/creator_home/domain/repositories/creator_home_repository.dart';

/// Turns datasource exceptions into failures (see `apiResult`).
final class CreatorHomeRepositoryImpl implements CreatorHomeRepository {
  const CreatorHomeRepositoryImpl(this._home, this._account, this._inbox);

  final CreatorHomeRemoteDataSource _home;
  final CreatorAccountRemoteDataSource _account;
  final InboxRemoteDataSource _inbox;

  @override
  Future<Result<CreatorHome>> home() =>
      apiResult(() async => (await _home.home()).toEntity());

  @override
  Future<Result<void>> answerBooking(
    String ref, {
    required bool confirm,
    String? reason,
  }) => apiResult(() async {
    await _account.answer(ref, confirm: confirm, reason: reason);
  });

  @override
  Future<Result<void>> answerBrief(
    String ref, {
    required String persona,
    required bool accept,
    String? reason,
    String? note,
  }) => apiResult(() async {
    await _inbox.answer(
      ref,
      persona: persona,
      accept: accept,
      reason: reason,
      note: note,
    );
  });
}
