import 'package:shoot_mobile/core/error/exceptions.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';

/// Runs a datasource [call] and turns its outcome into a [Result], the same
/// way for every API repository:
/// - [NetworkException] gives [NetworkFailure];
/// - a [ServerException] with status 404 gives [NotFoundFailure] (screen 37);
/// - any other [ServerException] gives [ServerFailure] with its status and
///   problem code;
/// - a [FormatException] (an answer the models cannot read) gives a
///   [ServerFailure] with no code;
/// - any other exception gives [UnexpectedFailure].
Future<Result<T>> apiResult<T>(Future<T> Function() call) async {
  try {
    return Ok(await call());
  } on NetworkException {
    return Err<T>(const NetworkFailure());
  } on ServerException catch (e) {
    if (e.statusCode == 404) return Err<T>(const NotFoundFailure());
    return Err<T>(
      ServerFailure(
        statusCode: e.statusCode,
        code: e.code,
        fields: e.fields,
        retryAfter: e.retryAfter,
      ),
    );
  } on FormatException {
    return Err<T>(const ServerFailure());
  } on Exception {
    return Err<T>(const UnexpectedFailure());
  }
}
