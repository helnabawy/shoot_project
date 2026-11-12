import 'package:shoot_mobile/core/error/api_result.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/quick_match/data/datasources/quick_match_remote_data_source.dart';
import 'package:shoot_mobile/features/quick_match/domain/entities/quick_match.dart';
import 'package:shoot_mobile/features/quick_match/domain/repositories/quick_match_repository.dart';

/// Turns datasource exceptions into failures (see `apiResult`) and models into entities.
final class QuickMatchRepositoryImpl implements QuickMatchRepository {
  const QuickMatchRepositoryImpl(this._remote);

  final QuickMatchRemoteDataSource _remote;

  @override
  Future<Result<MatchPage>> getMatch(
    String ref,
    String key, {
    String? date,
    String? duration,
  }) => apiResult(
    () async => (await _remote.fetchMatch(ref, key, date: date, duration: duration)).toEntity(),
  );

  @override
  Future<Result<QuotationIssued>> issueQuotation(
    String ref,
    String key,
    List<Pick> picks,
    BookingDetails details,
  ) => apiResult(
    () async => (await _remote.issueQuotation(ref, key, picks, details)).toEntity(),
  );

  @override
  Future<Result<BookingView>> getBooking(String ref, String key) =>
      apiResult(() async => (await _remote.fetchBooking(ref, key)).toEntity());

  @override
  Future<Result<BookingView>> accept(String ref, String key) =>
      apiResult(() async => (await _remote.accept(ref, key)).toEntity());

  @override
  Future<Result<BookingView>> confirmDelivery(String ref, String key) =>
      apiResult(() async => (await _remote.confirmDelivery(ref, key)).toEntity());

  @override
  Future<Result<BookingView>> report(String ref, String key, String reason) =>
      apiResult(() async => (await _remote.report(ref, key, reason)).toEntity());

  @override
  Future<Result<BookingView>> pickAnother(
    String ref,
    String key,
    String persona,
    String code,
  ) => apiResult(
    () async => (await _remote.pickAnother(ref, key, persona, code)).toEntity(),
  );

  @override
  Future<Result<FreshQuotation>> fresh(String ref, String key) =>
      apiResult(() async => (await _remote.fresh(ref, key)).toEntity());
}
