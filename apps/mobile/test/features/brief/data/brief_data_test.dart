import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/brief/data/brief_data.dart';
import 'package:shoot_mobile/features/brief/domain/brief_draft.dart';
import 'package:shoot_mobile/features/brief/domain/brief_receipt.dart';

import '../../../helpers/brief_fixtures.dart';
import '../../../helpers/scripted_adapter.dart';

void main() {
  test(
    'ML-US1-S6 the body lists each chosen value in slot order, no labels',
    () {
      final body = briefRecordBody(
        fxConfig(),
        const BriefDraft(
          values: {
            'location': ['dubai'],
            'persona': ['videographer', 'photographer'],
            'occasion': ['wedding'],
          },
          date: '2026-12-06',
        ),
      );
      expect(body['selections'], [
        {'token': 'persona', 'value': 'videographer'},
        {'token': 'persona', 'value': 'photographer'},
        {'token': 'occasion', 'value': 'wedding'},
        {'token': 'location', 'value': 'dubai'},
      ]);
      expect(body['date'], '2026-12-06');
    },
  );

  test('ML-US1-S6 a 201 receipt decodes', () async {
    final adapter = ScriptedAdapter(
      (_) => jsonBody({
        'reference': 'B-9',
        'sentence': 's',
        'whatsappUrl': null,
        'matchPath': '/match/B-9/k',
      }, status: 201),
    );
    final repo = BriefRepositoryImpl(Dio()..httpClientAdapter = adapter);
    final result = await repo.record(fxConfig(), const BriefDraft());
    final receipt = (result as Ok<BriefReceipt>).value;
    expect(receipt.matchPath, '/match/B-9/k');
    expect(adapter.lastRequest!.path, endsWith('/api/mobile/v1/briefs'));
    expect(adapter.lastRequest!.method, 'POST');
  });

  test('a 429 becomes a failure with its code', () async {
    final adapter = ScriptedAdapter(
      (_) => jsonBody(
        {'status': 429, 'code': 'brief.errors.tooMany', 'title': 't'},
        status: 429,
        contentType: 'application/problem+json',
      ),
    );
    final repo = BriefRepositoryImpl(Dio()..httpClientAdapter = adapter);
    final result = await repo.record(fxConfig(), const BriefDraft());
    expect(((result as Err).failure as ServerFailure).statusCode, 429);
  });
}
