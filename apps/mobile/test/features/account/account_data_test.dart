import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/error/exceptions.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/account/data/datasources/account_remote_data_source.dart';
import 'package:shoot_mobile/features/account/data/models/account_models.dart';
import 'package:shoot_mobile/features/account/data/repositories/account_repository_impl.dart';
import 'package:shoot_mobile/features/account/domain/entities/account.dart';

import '../../helpers/api_examples.dart';

class _Remote extends Mock implements AccountRemoteDataSource {}

void main() {
  group('MK-US1-S1 the account home decodes from the shared example', () {
    test('every field of me-account', () {
      final home = AccountHomeModel.fromJson(loadExample('me-account'))
          .toEntity();
      expect(home.name, 'Sara');
      expect(home.phone, '+971501234567');
      expect(home.upNext?.kind, UpNextKind.quote);
      expect(home.upNext?.booking.status, BookingStatus.awaitingAcceptance);
      expect(home.upNext?.booking.date, DateTime.utc(2026, 12, 12));
      expect(home.upNext?.booking.totalFils, 280000);
      expect(home.bookingsWaiting, 1);
      expect(home.briefs.single.status, BriefStatus.contacted);
      expect(home.briefs.single.bookingReference, 'Q-2026-0142');
      expect(home.finishAutoOpen, isTrue);
      expect(home.email, isNull);
      expect(home.about, hasLength(2));
    });

    test('me-account-empty has no up next', () {
      final home = AccountHomeModel.fromJson(loadExample('me-account-empty'))
          .toEntity();
      expect(home.upNext, isNull);
      expect(home.name, isNull);
      expect(home.briefs, isEmpty);
    });

    test('an unknown status reads as unknown, a missing field throws', () {
      final json = loadExample('me-bookings');
      final list = (json['upcoming'] as List).cast<Map<String, dynamic>>();
      final mutated = {
        ...json,
        'upcoming': [
          {...list.first, 'status': 'somethingNew'},
        ],
      };
      expect(
        BookingListModel.fromJson(mutated).toEntity().upcoming.single.status,
        BookingStatus.unknown,
      );
      expect(
        () => AccountHomeModel.fromJson({'person': <String, dynamic>{}}),
        throwsFormatException,
      );
    });

    test('the update body carries only what is set', () {
      expect(const MeUpdateModel(name: 'Sara').toJson(), {'name': 'Sara'});
      expect(const MeUpdateModel(finishShown: true).toJson(), {
        'finishShown': true,
      });
    });
  });

  group('the repository maps failures', () {
    setUpAll(() => registerFallbackValue(const MeUpdateModel()));

    late _Remote remote;
    late AccountRepositoryImpl repository;

    setUp(() {
      remote = _Remote();
      repository = AccountRepositoryImpl(remote);
    });

    test('a connection problem is a NetworkFailure', () async {
      when(() => remote.fetchHome()).thenThrow(const NetworkException());
      final result = await repository.getHome();
      expect(result, isA<Err<AccountHome>>());
      expect((result as Err).failure, isA<NetworkFailure>());
    });

    test('a 404 (a creator account) is a NotFoundFailure', () async {
      when(() => remote.fetchHome())
          .thenThrow(const ServerException(statusCode: 404));
      expect(
        ((await repository.getHome()) as Err).failure,
        isA<NotFoundFailure>(),
      );
    });

    test('a 422 keeps its field codes', () async {
      when(() => remote.update(any())).thenThrow(
        const ServerException(
          statusCode: 422,
          code: 'api.errors.invalidInput',
          fields: [(path: 'body.email', code: 'account.errors.emailInUse')],
        ),
      );
      final failure =
          ((await repository.updateDetails(email: 'a@b.ae')) as Err).failure
              as ServerFailure;
      expect(failure.fieldCode('body.email'), 'account.errors.emailInUse');
    });

    test('pages are asked for by number', () async {
      when(() => remote.fetchBookings(2)).thenAnswer(
        (_) async => BookingListModel.fromJson(loadExample('me-bookings')),
      );
      expect(await repository.getBookings(page: 2), isA<Ok<BookingList>>());
      verify(() => remote.fetchBookings(2)).called(1);
    });
  });
}
