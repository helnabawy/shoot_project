import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/error/exceptions.dart';
import 'package:shoot_mobile/core/l10n/failure_message.dart';
import 'package:shoot_mobile/core/network/api_get.dart';

import 'helpers/api_decoders.dart';
import 'helpers/api_examples.dart';
import 'helpers/scripted_adapter.dart';

void main() {
  group('MR-US2-S3 shared examples', () {
    final names = exampleNames();

    test('the examples folder is not empty', () {
      expect(names, isNotEmpty);
    });

    test('every file in the examples folder has a row', () {
      final missing = [
        for (final name in names)
          if (!apiDecoders.containsKey(exampleBaseName(name)) &&
              !isProblemExample(name) &&
              !nonApiExamples.contains(exampleBaseName(name)))
            name,
      ];
      expect(missing, isEmpty, reason: 'add a row to apiDecoders');
    });

    for (final name in names) {
      final decode = apiDecoders[exampleBaseName(name)];
      if (decode != null) {
        test('$name decodes and maps to an entity', () {
          expect(decode(loadExample(name)), isNotNull);
        });
      } else if (isProblemExample(name)) {
        test('$name decodes as a problem with a known code', () async {
          final json = loadExample(name);
          final status = json['status']! as int;
          final dio = Dio(BaseOptions(baseUrl: 'http://api.test'))
            ..httpClientAdapter = ScriptedAdapter(
              (_) => jsonBody(
                json,
                status: status,
                contentType: 'application/problem+json',
              ),
            );

          await expectLater(
            apiGet(dio, 'site'),
            throwsA(
              isA<ServerException>()
                  .having((e) => e.statusCode, 'statusCode', status)
                  .having(
                    (e) => ProblemCode.fromWire(e.code),
                    'known code',
                    isNotNull,
                  ),
            ),
          );
        });
      }
    }
  });
}
