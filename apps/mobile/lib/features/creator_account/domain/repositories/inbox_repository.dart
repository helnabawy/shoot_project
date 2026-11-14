import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/creator_account/domain/entities/inbox.dart';

/// The creator brief inbox (feature 019). Each write answers the whole inbox again.
abstract interface class InboxRepository {
  Future<Result<CreatorInbox>> inbox();

  Future<Result<CreatorInbox>> accept(BriefItem item);

  Future<Result<CreatorInbox>> reject(
    BriefItem item, {
    String? reason,
    String? note,
  });

  /// Undo a rejection or take back a yes.
  Future<Result<CreatorInbox>> withdraw(BriefItem item);
}
