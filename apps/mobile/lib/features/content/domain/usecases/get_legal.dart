import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/usecase/use_case.dart';
import 'package:shoot_mobile/features/content/domain/entities/legal.dart';
import 'package:shoot_mobile/features/content/domain/repositories/content_repository.dart';

/// The version of a legal document in force now, with any later version announced.
final class GetLegal implements UseCase<LegalDocument, LegalKind> {
  const GetLegal(this._repository);

  final ContentRepository _repository;

  @override
  Future<Result<LegalDocument>> call(LegalKind kind) =>
      _repository.getLegal(kind);
}

/// Every published version of a document, newest first.
final class GetLegalVersions implements UseCase<LegalVersions, LegalKind> {
  const GetLegalVersions(this._repository);

  final ContentRepository _repository;

  @override
  Future<Result<LegalVersions>> call(LegalKind kind) =>
      _repository.getLegalVersions(kind);
}

typedef LegalVersionParams = ({LegalKind kind, int version});

/// One published version, in force or earlier.
final class GetLegalVersion
    implements UseCase<LegalDocument, LegalVersionParams> {
  const GetLegalVersion(this._repository);

  final ContentRepository _repository;

  @override
  Future<Result<LegalDocument>> call(LegalVersionParams params) =>
      _repository.getLegalVersion(params.kind, params.version);
}
