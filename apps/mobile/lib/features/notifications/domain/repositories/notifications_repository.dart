import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/notifications/domain/entities/notice.dart';

/// The member's notices (`/api/mobile/v1/me/notifications`).
abstract interface class NotificationsRepository {
  Future<Result<Notices>> notices();

  /// Marks one read; answers the list as it now stands.
  Future<Result<Notices>> markRead(String id);
}
