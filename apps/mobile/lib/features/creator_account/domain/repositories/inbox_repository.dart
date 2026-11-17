import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/creator_account/domain/entities/inbox.dart';

/// The creator brief inbox (feature 019). Each write answers the whole inbox again.
abstract interface class InboxRepository {
  Future<Result<CreatorInbox>> inbox();

  /// [amountFils]: an offer on an offers brief; `null` accepts the client's price.
  Future<Result<CreatorInbox>> accept(BriefItem item, {int? amountFils});

  Future<Result<CreatorInbox>> reject(
    BriefItem item, {
    String? reason,
    String? note,
  });

  /// Undo a rejection or take back a yes.
  Future<Result<CreatorInbox>> withdraw(BriefItem item);

  /// 022: a fingerprint that changes when the inbox does.
  Future<Result<String>> stamp();
}
