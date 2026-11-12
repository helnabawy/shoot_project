import 'package:dio/dio.dart';
import 'package:shoot_mobile/core/error/exceptions.dart';
import 'package:shoot_mobile/core/network/api_get.dart';
import 'package:shoot_mobile/core/network/api_post.dart';
import 'package:shoot_mobile/features/account/data/models/account_models.dart';

/// The account from `/api/mobile/v1` (the shared Dio signs every call with the session's Bearer
/// token). Throws [NetworkException] or [ServerException], or [FormatException] when an answer
/// does not decode; never a Dio type.
abstract interface class AccountRemoteDataSource {
  Future<AccountHomeModel> fetchHome();

  Future<BookingListModel> fetchBookings(int page);

  Future<BriefListModel> fetchBriefs(int page);

  Future<void> update(MeUpdateModel body);
}

final class AccountRemoteDataSourceImpl implements AccountRemoteDataSource {
  const AccountRemoteDataSourceImpl(this._dio);

  final Dio _dio;

  Map<String, Object?>? _page(int page) => page > 1 ? {'page': '$page'} : null;

  @override
  Future<AccountHomeModel> fetchHome() async =>
      AccountHomeModel.fromJson(await apiGet(_dio, 'me/account'));

  @override
  Future<BookingListModel> fetchBookings(int page) async =>
      BookingListModel.fromJson(
        await apiGet(_dio, 'me/bookings', query: _page(page)),
      );

  @override
  Future<BriefListModel> fetchBriefs(int page) async => BriefListModel.fromJson(
    await apiGet(_dio, 'me/briefs', query: _page(page)),
  );

  @override
  Future<void> update(MeUpdateModel body) async {
    await apiPatch(_dio, 'me', body: body.toJson());
  }
}
