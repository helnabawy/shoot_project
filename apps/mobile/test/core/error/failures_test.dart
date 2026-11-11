import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/error/exceptions.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/l10n/failure_message.dart';
import 'package:shoot_mobile/core/l10n/generated/app_localizations_en.dart';

void main() {
  test('ServerException keeps its status, code and fields', () {
    const e = ServerException(
      statusCode: 422,
      code: 'api.errors.invalidInput',
      fields: [(path: 'query.locale', code: 'api.errors.localeUnsupported')],
    );

    expect(e.statusCode, 422);
    expect(e.code, 'api.errors.invalidInput');
    expect(e.fields.single.path, 'query.locale');
    expect(const ServerException().fields, isEmpty);
    expect(e.toString(), contains('api.errors.invalidInput'));
  });

  test('ServerFailure compares by status and code', () {
    expect(
      const ServerFailure(statusCode: 429, code: 'api.errors.rateLimited'),
      const ServerFailure(statusCode: 429, code: 'api.errors.rateLimited'),
    );
    expect(
      const ServerFailure(statusCode: 429, code: 'api.errors.rateLimited'),
      isNot(const ServerFailure(statusCode: 429)),
    );
  });

  test('NotFoundFailure is a failure of its own, with its own words', () {
    final l10n = AppLocalizationsEn();

    expect(const NotFoundFailure(), const NotFoundFailure());
    expect(
      const NotFoundFailure(),
      isNot(const ServerFailure(statusCode: 404)),
    );
    expect(const NotFoundFailure().message(l10n), l10n.problemNotFound);
    expect(const ServerFailure().message(l10n), l10n.failureServer);
  });
}
