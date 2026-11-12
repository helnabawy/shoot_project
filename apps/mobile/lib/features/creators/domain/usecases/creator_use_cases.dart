import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/usecase/use_case.dart';
import 'package:shoot_mobile/features/creators/domain/entities/creators.dart';
import 'package:shoot_mobile/features/creators/domain/repositories/creators_repository.dart';

/// One page of the directory for a query (screen 15).
final class GetCreators implements UseCase<CreatorList, CreatorQuery> {
  const GetCreators(this._repository);

  final CreatorsRepository _repository;

  @override
  Future<Result<CreatorList>> call(CreatorQuery params) =>
      _repository.getCreators(params);
}

/// A listed creator's profile by code in any spelling; an unlisted one is `NotFoundFailure`
/// (MC FR-001).
final class GetCreatorProfile implements UseCase<CreatorProfile, String> {
  const GetCreatorProfile(this._repository);

  final CreatorsRepository _repository;

  @override
  Future<Result<CreatorProfile>> call(String params) =>
      _repository.getProfile(params);
}

/// `/work/{specialty}` (screen 18); an unknown or inactive specialty is `NotFoundFailure`.
final class GetSpecialtyPage implements UseCase<SpecialtyPage, String> {
  const GetSpecialtyPage(this._repository);

  final CreatorsRepository _repository;

  @override
  Future<Result<SpecialtyPage>> call(String params) =>
      _repository.getSpecialty(params);
}

/// `/hire/{slug}` (screen 19); an unknown or draft page is `NotFoundFailure`.
final class GetHirePage implements UseCase<HirePage, String> {
  const GetHirePage(this._repository);

  final CreatorsRepository _repository;

  @override
  Future<Result<HirePage>> call(String params) =>
      _repository.getHirePage(params);
}
