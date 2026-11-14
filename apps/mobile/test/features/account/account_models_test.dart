import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/features/account/data/models/account_models.dart';

import '../../helpers/api_examples.dart';

void main() {
  group('BI-US4-S3 the client sees who said yes', () {
    test('a brief carries how many creators said yes; none reads as zero', () {
      final list = BriefListModel.fromJson(loadExample('me-briefs')).toEntity();
      expect(list.items.first.saidYes, 2);
      expect(list.items.skip(1).every((b) => b.saidYes == 0), isTrue);
    });
  });
}
