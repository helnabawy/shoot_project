import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/error/exceptions.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/site/data/datasources/site_remote_data_source.dart';
import 'package:shoot_mobile/features/site/data/models/audience_model.dart';
import 'package:shoot_mobile/features/site/data/models/brief_builder_model.dart';
import 'package:shoot_mobile/features/site/data/models/navigation_model.dart';
import 'package:shoot_mobile/features/site/data/models/site_info_model.dart';
import 'package:shoot_mobile/features/site/data/repositories/site_repository_impl.dart';

import '../../../../helpers/api_examples.dart';

Matcher _fails(Failure failure) =>
    isA<Err<Object?>>().having((e) => e.failure, 'failure', failure);

class _MockRemote extends Mock implements SiteRemoteDataSource {}

void main() {
  late _MockRemote remote;
  late SiteRepositoryImpl repository;

  setUp(() {
    remote = _MockRemote();
    repository = SiteRepositoryImpl(remote);
  });

  group('MR-US1-S1 site repository', () {
    test('a datasource value gives Ok with the entity', () async {
      final site = SiteInfoModel.fromJson(loadExample('site'));
      final nav = NavigationModel.fromJson(loadExample('navigation'));
      final audience = AudienceModel.fromJson(loadExample('personas'));
      final brief = BriefBuilderModel.fromJson(loadExample('brief-builder'));
      when(() => remote.fetchSite()).thenAnswer((_) async => site);
      when(() => remote.fetchNavigation()).thenAnswer((_) async => nav);
      when(() => remote.fetchAudience()).thenAnswer((_) async => audience);
      when(() => remote.fetchBriefBuilder()).thenAnswer((_) async => brief);

      expect(await repository.getSite(), Ok(site.toEntity()));
      expect(await repository.getNavigation(), Ok(nav.toEntity()));
      expect(await repository.getAudience(), Ok(audience.toEntity()));
      expect(await repository.getBriefBuilder(), Ok(brief.toEntity()));
    });

    test('NetworkException gives NetworkFailure', () async {
      when(() => remote.fetchSite()).thenThrow(const NetworkException());

      expect(await repository.getSite(), _fails(const NetworkFailure()));
    });

    test('ServerException(404) gives NotFoundFailure', () async {
      when(() => remote.fetchNavigation()).thenThrow(
        const ServerException(statusCode: 404, code: 'api.errors.notFound'),
      );

      expect(await repository.getNavigation(), _fails(const NotFoundFailure()));
    });

    test('ServerException(500, code) gives ServerFailure(code)', () async {
      when(() => remote.fetchAudience()).thenThrow(
        const ServerException(statusCode: 500, code: 'api.errors.unexpected'),
      );

      expect(
        await repository.getAudience(),
        _fails(
          const ServerFailure(statusCode: 500, code: 'api.errors.unexpected'),
        ),
      );
    });

    test('an answer that does not decode gives ServerFailure', () async {
      when(() => remote.fetchBriefBuilder())
          .thenThrow(const FormatException('bad'));

      expect(await repository.getBriefBuilder(), _fails(const ServerFailure()));
    });

    test('any other exception gives UnexpectedFailure', () async {
      when(() => remote.fetchSite()).thenThrow(Exception('boom'));

      expect(await repository.getSite(), _fails(const UnexpectedFailure()));
    });
  });
}
