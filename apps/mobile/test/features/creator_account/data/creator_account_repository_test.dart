import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/creator_account/data/datasources/creator_account_remote_data_source.dart';
import 'package:shoot_mobile/features/creator_account/data/repositories/creator_account_repository_impl.dart';
import 'package:shoot_mobile/features/creator_account/domain/entities/creator_account.dart';

import '../../../helpers/api_examples.dart';
import '../../../helpers/scripted_adapter.dart';
import '../fixtures.dart';

void main() {
  late ScriptedAdapter adapter;
  late CreatorAccountRepositoryImpl repo;

  void script(ResponseBody Function(RequestOptions o) respond) {
    adapter = ScriptedAdapter(respond);
    final dio = Dio(BaseOptions(baseUrl: 'http://api.test'))
      ..httpClientAdapter = adapter;
    repo = CreatorAccountRepositoryImpl(
      CreatorAccountRemoteDataSourceImpl(dio),
    );
  }

  test('MW-US1-S1 reads the profile from me/creator/profile', () async {
    script((_) => jsonBody(loadExample('creator-profile-draft')));
    final r = await repo.profile();
    expect(r, isA<Ok<MyProfile>>());
    expect(adapter.lastRequest!.method, 'GET');
    expect(adapter.lastRequest!.path, '/api/mobile/v1/me/creator/profile');
  });

  test(
    'MW-US1-S4 saves a patch with PATCH and the fields as the body',
    () async {
      script((_) => jsonBody(loadExample('creator-profile-saved')));
      await repo.saveProfile({'gender': 'man'});
      expect(adapter.lastRequest!.method, 'PATCH');
      expect(adapter.lastRequest!.data, {'gender': 'man'});
    },
  );

  test('MW-US1-S9 a refused save keeps the field codes', () async {
    script(
      (_) => jsonBody(
        {
          'type': 'about:blank',
          'status': 422,
          'code': 'api.errors.invalidInput',
          'fields': [
            {'path': 'body.gender', 'code': 'creators.errors.required'},
          ],
        },
        status: 422,
        contentType: 'application/problem+json',
      ),
    );
    final r = await repo.saveProfile({});
    final failure = (r as Err<MyProfile>).failure as ServerFailure;
    expect(failure.fieldCode('body.gender'), 'creators.errors.required');
  });

  test(
    'MW-US1-S8 an identity upload sends base64 to me/creator/identity/{kind}',
    () async {
      script((_) => jsonBody(loadExample('creator-identity-result')));
      await repo.uploadIdentity(
        IdentityKind.tradeLicense,
        pickedFile(type: 'application/pdf', name: 'tl.pdf', size: 3),
      );
      final o = adapter.lastRequest!;
      expect(o.method, 'PUT');
      expect(o.path, endsWith('/me/creator/identity/trade-license'));
      final body = o.data as Map;
      expect(body['contentType'], 'application/pdf');
      expect(base64Decode(body['data'] as String), hasLength(3));
    },
  );

  test(
    'MW-US1-S7 sends for review with POST, photo and samples with their bodies',
    () async {
      script((_) => jsonBody(loadExample('creator-profile-submitted')));
      await repo.submit();
      expect(adapter.lastRequest!.path, endsWith('/profile/submit'));
      await repo.setHidden(hidden: true);
      expect(adapter.lastRequest!.data, {'hidden': true});
      await repo.uploadPhoto(pickedFile());
      expect(adapter.lastRequest!.path, endsWith('/profile/photo'));
      await repo.addSample(
        file: pickedFile(),
        caption: const LocalText(en: 'A'),
        specialty: '10',
      );
      expect((adapter.lastRequest!.data as Map)['specialty'], '10');
      await repo.removeSample(2);
      expect(adapter.lastRequest!.method, 'DELETE');
      expect(adapter.lastRequest!.path, endsWith('/profile/samples/2'));
    },
  );

  test(
    'MW-US4-S2 a day is saved with PUT me/creator/availability/{date}',
    () async {
      script((_) => jsonBody(loadExample('creator-availability-set-result')));
      final r = await repo.setDay(DateTime(2026, 11, 25), blocked: true);
      expect(r, isA<Ok<Availability>>());
      expect(adapter.lastRequest!.path, endsWith('/availability/2026-11-25'));
      expect(adapter.lastRequest!.data, {'blocked': true});
      await repo.availability();
      expect(adapter.lastRequest!.method, 'GET');
    },
  );

  test(
    'MW-US2-S2 and S3 answers and deliveries use the booking reference',
    () async {
      script((_) => jsonBody(loadExample('creator-bookings-answered')));
      await repo.answer('B-1', confirm: true);
      expect(adapter.lastRequest!.path, endsWith('/bookings/B-1/answer'));
      expect(adapter.lastRequest!.data, {'decision': 'confirm'});
      await repo.answer('B-1', confirm: false, reason: ' no ');
      expect(adapter.lastRequest!.data, {
        'decision': 'decline',
        'reason': 'no',
      });
      await repo.deliver('B-1');
      expect(adapter.lastRequest!.path, endsWith('/bookings/B-1/deliver'));
      await repo.markUpdateRead('7');
      expect(adapter.lastRequest!.path, endsWith('/updates/7/read'));
      await repo.bookings();
      expect(adapter.lastRequest!.method, 'GET');
    },
  );

  test(
    'MW-US3-S1 reads the account; an unreadable answer is a failure',
    () async {
      script((_) => jsonBody(loadExample('creator-account')));
      expect(await repo.account(), isA<Ok<CreatorAccount>>());
      script((_) => jsonBody({'name': 1}));
      final r = await repo.account();
      expect((r as Err<CreatorAccount>).failure, const ServerFailure());
    },
  );

  test('a creator-only 403 and a missing profile map to failures', () async {
    script(
      (_) => jsonBody(
        {
          'type': 'about:blank',
          'status': 403,
          'code': 'creators.errors.notProvider',
        },
        status: 403,
        contentType: 'application/problem+json',
      ),
    );
    final r = await repo.profile();
    expect(
      ((r as Err<MyProfile>).failure as ServerFailure).code,
      'creators.errors.notProvider',
    );
  });
}
