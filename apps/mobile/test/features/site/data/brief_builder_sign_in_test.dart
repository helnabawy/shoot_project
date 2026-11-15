import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/features/site/data/models/brief_builder_model.dart';

import '../../../helpers/api_examples.dart';

void main() {
  group('021 GET brief-builder says whether sending needs sign-in', () {
    test('BS-US4-S1 the example carries the switch, in both languages', () {
      for (final name in ['brief-builder', 'brief-builder.ar']) {
        final entity = BriefBuilderModel.fromJson(loadExample(name)).toEntity();
        expect(entity.signInRequired, isTrue, reason: name);
      }
    });

    test(
      'BS-US4-S1 an older server without the field reads as not required',
      () {
        final json = Map<String, Object?>.of(loadExample('brief-builder'))
          ..remove('signInRequired');
        expect(
          BriefBuilderModel.fromJson(json).toEntity().signInRequired,
          isFalse,
        );
      },
    );
  });
}
