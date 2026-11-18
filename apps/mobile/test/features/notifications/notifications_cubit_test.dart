import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/notifications/data/models/notices_model.dart';
import 'package:shoot_mobile/features/notifications/domain/entities/notice.dart';
import 'package:shoot_mobile/features/notifications/domain/repositories/notifications_repository.dart';
import 'package:shoot_mobile/features/notifications/presentation/cubit/notifications_cubit.dart';

import '../../helpers/api_examples.dart';

class _Repo extends Mock implements NotificationsRepository {}

Notices _example(String name) =>
    NoticesModel.fromJson(loadExample(name)).toEntity();

void main() {
  late _Repo repo;
  setUp(() => repo = _Repo());

  Future<NotificationsCubit> loaded() async {
    when(() => repo.notices()).thenAnswer((_) async => Ok(_example('notices')));
    final cubit = NotificationsCubit(repo);
    addTearDown(cubit.close);
    await cubit.load();
    return cubit;
  }

  test(
    'NT-US1-S1 loads the notices, new ones apart from earlier ones',
    () async {
      final cubit = await loaded();
      final s = cubit.state as NotificationsLoaded;
      expect(s.unread.map((n) => n.id), ['12', '7']);
      expect(s.earlier.map((n) => n.id), ['5']);
    },
  );

  test('a failed read is a failure state', () async {
    when(() => repo.notices())
        .thenAnswer((_) async => const Err(NetworkFailure()));
    final cubit = NotificationsCubit(repo);
    addTearDown(cubit.close);
    await cubit.load();
    expect(cubit.state, const NotificationsFailed(NetworkFailure()));
  });

  test('NT-US1-S2 opening an unread notice marks it read; a read one is not sent again', () async {
    final cubit = await loaded();
    when(() => repo.markRead('12'))
        .thenAnswer((_) async => Ok(_example('notices-read')));
    final s = cubit.state as NotificationsLoaded;
    await cubit.markRead(s.unread.first);
    expect((cubit.state as NotificationsLoaded).notices.unread, 0);
    await cubit.markRead(s.earlier.first);
    verify(() => repo.markRead('12')).called(1);
    verifyNever(() => repo.markRead('5'));
  });

  test(
    'NT-US1-S2 a mark-as-read that fails keeps the list and says so',
    () async {
      final cubit = await loaded();
      when(() => repo.markRead('7'))
          .thenAnswer((_) async => const Err(NetworkFailure()));
      final before = (cubit.state as NotificationsLoaded).notices;
      await cubit.markRead(before.items[1]);
      final s = cubit.state as NotificationsLoaded;
      expect(s.notices, before);
      expect(s.failure, const NetworkFailure());
    },
  );
}
