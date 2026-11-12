import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/creators/domain/entities/creators.dart';

/// Creators, specialty pages and hire pages, in the app's current language.
/// A missing or non-public thing is a `NotFoundFailure`.
abstract interface class CreatorsRepository {
  Future<Result<CreatorList>> getCreators([CreatorQuery query]);

  /// [code] in any spelling ("sh-0087").
  Future<Result<CreatorProfile>> getProfile(String code);

  Future<Result<SpecialtyPage>> getSpecialty(String slug);

  Future<Result<HirePage>> getHirePage(String slug);
}
