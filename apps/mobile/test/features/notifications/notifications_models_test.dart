import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/features/notifications/data/models/notices_model.dart';
import 'package:shoot_mobile/features/notifications/domain/entities/notice.dart';

import '../../helpers/api_examples.dart';

void main() {
  group('NT-US1-S1 notices', () {
    test(
      'decode the example: newest first, read and unread, with the count',
      () {
        final notices = NoticesModel.fromJson(loadExample('notices'))
            .toEntity();
        expect(notices.unread, 2);
        expect(notices.items.map((n) => n.id), ['12', '7', '5']);
        expect(notices.items.map((n) => n.read), [false, false, true]);
        final first = notices.items.first;
        expect(first.audience, NoticeAudience.client);
        expect(first.aboutBrief, isTrue);
        expect(first.path, '/match/B-7K2QX/k3y');
        expect(notices.items.last.path, isNull);
      },
    );

    test('an audience this build does not know reads as unknown', () {
      final json = loadExample('notices');
      final items = (json['items']! as List).cast<Map<String, dynamic>>();
      items.first['audience'] = 'someone-new';
      final notices = NoticesModel.fromJson(json).toEntity();
      expect(notices.items.first.audience, NoticeAudience.unknown);
    });
  });
}
