import 'package:dio/dio.dart';
import 'package:shoot_mobile/core/error/exceptions.dart';
import 'package:shoot_mobile/core/network/api_get.dart';
import 'package:shoot_mobile/features/creators/data/models/creator_models.dart';
import 'package:shoot_mobile/features/creators/domain/entities/creators.dart';

/// Creators from `/api/mobile/v1`. Throws [NetworkException] or
/// [ServerException] (via `apiGet`), or [FormatException] when the answer
/// does not decode; never a Dio type.
abstract interface class CreatorsRemoteDataSource {
  Future<CreatorListModel> fetchCreators(CreatorQuery query);

  Future<CreatorProfileModel> fetchProfile(String code);

  Future<SpecialtyPageModel> fetchSpecialty(String slug);

  Future<HirePageModel> fetchHirePage(String slug);
}

final class CreatorsRemoteDataSourceImpl implements CreatorsRemoteDataSource {
  const CreatorsRemoteDataSourceImpl(this._dio);

  final Dio _dio;

  @override
  Future<CreatorListModel> fetchCreators(CreatorQuery query) async {
    final page = query.page;
    return CreatorListModel.fromJson(
      await apiGet(
        _dio,
        'creators',
        query: {
          'type': ?query.type,
          'specialty': ?query.specialty,
          'place': ?query.place,
          if (page != null && page > 1) 'page': '$page',
        },
      ),
    );
  }

  @override
  Future<CreatorProfileModel> fetchProfile(String code) async =>
      CreatorProfileModel.fromJson(
        await apiGet(_dio, 'creators/${Uri.encodeComponent(code)}'),
      );

  @override
  Future<SpecialtyPageModel> fetchSpecialty(String slug) async =>
      SpecialtyPageModel.fromJson(
        await apiGet(_dio, 'work/${Uri.encodeComponent(slug)}'),
      );

  @override
  Future<HirePageModel> fetchHirePage(String slug) async =>
      HirePageModel.fromJson(
        await apiGet(_dio, 'hire/${Uri.encodeComponent(slug)}'),
      );
}
