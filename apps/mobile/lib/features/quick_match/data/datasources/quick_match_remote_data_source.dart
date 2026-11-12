import 'package:dio/dio.dart';
import 'package:shoot_mobile/core/network/api_get.dart';
import 'package:shoot_mobile/core/network/api_post.dart';
import 'package:shoot_mobile/features/quick_match/data/models/quick_match_models.dart';
import 'package:shoot_mobile/features/quick_match/domain/entities/quick_match.dart';

/// The booking endpoints of `/api/mobile/v1`. Throws `NetworkException` or `ServerException` (via
/// `apiGet` and `apiPost`), or `FormatException` when an answer does not decode; never a Dio type.
/// The private key is part of the path, as on the website.
abstract interface class QuickMatchRemoteDataSource {
  Future<MatchPageModel> fetchMatch(
    String ref,
    String key, {
    String? date,
    String? duration,
  });

  Future<QuotationIssuedModel> issueQuotation(
    String ref,
    String key,
    List<Pick> picks,
    BookingDetails details,
  );

  Future<BookingViewModel> fetchBooking(String ref, String key);

  Future<BookingViewModel> accept(String ref, String key);

  Future<BookingViewModel> confirmDelivery(String ref, String key);

  Future<BookingViewModel> report(String ref, String key, String reason);

  Future<BookingViewModel> pickAnother(
    String ref,
    String key,
    String persona,
    String code,
  );

  Future<FreshQuotationModel> fresh(String ref, String key);
}

final class QuickMatchRemoteDataSourceImpl
    implements QuickMatchRemoteDataSource {
  const QuickMatchRemoteDataSourceImpl(this._dio);

  final Dio _dio;

  static String _q(String ref, String key) =>
      '${Uri.encodeComponent(ref)}/${Uri.encodeComponent(key)}';

  @override
  Future<MatchPageModel> fetchMatch(
    String ref,
    String key, {
    String? date,
    String? duration,
  }) async => MatchPageModel.fromJson(
    await apiGet(
      _dio,
      'match/${_q(ref, key)}',
      query: {'date': ?date, 'duration': ?duration},
    ),
  );

  @override
  Future<QuotationIssuedModel> issueQuotation(
    String ref,
    String key,
    List<Pick> picks,
    BookingDetails details,
  ) async => QuotationIssuedModel.fromJson(
    (await apiPost(
      _dio,
      'match/${_q(ref, key)}/quotation',
      body: quotationRequestJson(picks, details),
    )).body!,
  );

  @override
  Future<BookingViewModel> fetchBooking(String ref, String key) async =>
      BookingViewModel.fromJson(await apiGet(_dio, 'quotations/${_q(ref, key)}'));

  Future<BookingViewModel> _command(
    String ref,
    String key,
    String command, [
    Map<String, Object?>? body,
  ]) async => BookingViewModel.fromJson(
    (await apiPost(_dio, 'quotations/${_q(ref, key)}/$command', body: body)).body!,
  );

  @override
  Future<BookingViewModel> accept(String ref, String key) =>
      _command(ref, key, 'accept');

  @override
  Future<BookingViewModel> confirmDelivery(String ref, String key) =>
      _command(ref, key, 'confirm-delivery');

  @override
  Future<BookingViewModel> report(String ref, String key, String reason) =>
      _command(ref, key, 'report', {'reason': reason});

  @override
  Future<BookingViewModel> pickAnother(
    String ref,
    String key,
    String persona,
    String code,
  ) => _command(ref, key, 'pick-another', {'persona': persona, 'code': code});

  @override
  Future<FreshQuotationModel> fresh(String ref, String key) async =>
      FreshQuotationModel.fromJson(
        (await apiPost(_dio, 'quotations/${_q(ref, key)}/fresh')).body!,
      );
}
