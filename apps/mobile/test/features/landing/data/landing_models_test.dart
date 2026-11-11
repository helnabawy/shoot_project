import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/content/sections.dart';
import 'package:shoot_mobile/core/error/exceptions.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/landing/data/datasources/landing_remote_data_source.dart';
import 'package:shoot_mobile/features/landing/data/models/landing_model.dart';
import 'package:shoot_mobile/features/landing/data/repositories/landing_repository_impl.dart';
import 'package:shoot_mobile/features/landing/domain/entities/landing.dart';

import '../../../helpers/api_examples.dart';
import '../../../helpers/scripted_adapter.dart';

class _MockRemote extends Mock implements LandingRemoteDataSource {}

void main() {
  group('MR-US1-S2 landing model', () {
    test('landing.json decodes the hero, anchors and sections', () {
      final landing = LandingModel.fromJson(loadExample('landing')).toEntity();

      expect(landing.locale, 'en');
      expect(landing.hero.headline, 'You brief. We shoot.');
      expect(landing.hero.layout, HeroLayout.briefBuilder);
      expect(landing.hero.trustChips, isNotEmpty);
      expect(landing.hero.image?.sizes, isNotEmpty);
      expect(landing.hero.primaryCta, isNull);
      expect(landing.sections, hasLength(9));
      expect(landing.sections.whereType<UnknownSection>(), isEmpty);
      for (final anchor in landing.navigation) {
        expect(
          landing.sections.map((s) => s.anchor),
          contains(anchor.target),
          reason: '${anchor.label} points at a section',
        );
      }
    });

    test('a missing hero headline throws FormatException', () {
      final json = loadExample('landing');
      final hero = {...json['hero']! as Map<String, Object?>}
        ..remove('headline');
      expect(
        () => LandingModel.fromJson({...json, 'hero': hero}),
        throwsFormatException,
      );
    });

    test('overlayOpacity reads a whole or fractional number', () {
      final hero = {
        ...loadExample('landing')['hero']! as Map<String, Object?>,
        'overlayOpacity': 37.5,
      };
      expect(HeroModel.fromJson(hero).toEntity().overlayOpacity, 37.5);
    });
  });

  group('MR-US1-S1 landing datasource and repository', () {
    test('reads /api/mobile/v1/landing', () async {
      final adapter = ScriptedAdapter((_) => jsonBody(loadExample('landing')));
      final source = LandingRemoteDataSourceImpl(
        Dio(BaseOptions(baseUrl: 'http://api.test'))
          ..httpClientAdapter = adapter,
      );

      final model = await source.fetchLanding();

      expect(model.toEntity().hero.headline, 'You brief. We shoot.');
      expect(adapter.lastRequest?.path, '/api/mobile/v1/landing');
    });

    test('maps values and exceptions to Result', () async {
      final remote = _MockRemote();
      final repository = LandingRepositoryImpl(remote);
      final model = LandingModel.fromJson(loadExample('landing'));

      when(remote.fetchLanding).thenAnswer((_) async => model);
      expect(await repository.getLanding(), Ok<Landing>(model.toEntity()));

      when(remote.fetchLanding).thenThrow(const NetworkException());
      expect(
        await repository.getLanding(),
        const Err<Landing>(NetworkFailure()),
      );

      when(remote.fetchLanding)
          .thenThrow(const ServerException(statusCode: 404));
      expect(
        await repository.getLanding(),
        const Err<Landing>(NotFoundFailure()),
      );

      when(remote.fetchLanding).thenThrow(
        const ServerException(statusCode: 429, code: 'api.errors.rateLimited'),
      );
      expect(
        await repository.getLanding(),
        const Err<Landing>(
          ServerFailure(statusCode: 429, code: 'api.errors.rateLimited'),
        ),
      );
    });
  });
}
