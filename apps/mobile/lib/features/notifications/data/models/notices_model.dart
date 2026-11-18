import 'package:shoot_mobile/core/network/json_read.dart';
import 'package:shoot_mobile/features/notifications/domain/entities/notice.dart';

/// `noticesV1`. An unknown audience reads as [NoticeAudience.unknown].
final class NoticesModel {
  const NoticesModel._(this._entity);

  factory NoticesModel.fromJson(Json json) => NoticesModel._(
    Notices(
      items: readList(json, 'items', (item) {
        final o = asObject(item);
        return Notice(
          id: readString(o, 'id'),
          event: readString(o, 'event'),
          audience: readEnum(
            o,
            'audience',
            NoticeAudience.values,
            NoticeAudience.unknown,
          ),
          ref: readNullableString(o, 'ref'),
          path: readNullableString(o, 'path'),
          createdAt: DateTime.parse(readString(o, 'createdAt')),
          read: readBool(o, 'read'),
        );
      }),
      unread: readInt(json, 'unread'),
    ),
  );

  final Notices _entity;

  Notices toEntity() => _entity;
}
