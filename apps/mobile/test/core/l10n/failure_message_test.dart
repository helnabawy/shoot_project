import 'dart:convert';
import 'dart:io';
import 'dart:ui';

import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/l10n/failure_message.dart';
import 'package:shoot_mobile/core/l10n/generated/app_localizations.dart';

const _snapshot = '../../specs/contracts/mobile-api/v1.schema.json';
const _problemsTs = '../../packages/domain/src/api/v1/problems.ts';

/// Every problem code v1 lists: the snapshot's `problems` once it is
/// committed, else `PROBLEM_CODES` in the domain package's `problems.ts`.
List<String> _contractCodes() {
  final snapshot = File(_snapshot);
  if (snapshot.existsSync()) {
    final problems =
        (jsonDecode(snapshot.readAsStringSync()) as Map)['problems'];
    final codes = <String>[
      if (problems is Map) ...problems.keys.cast<String>(),
      if (problems is List)
        for (final p in problems)
          if (p is String) p else if (p is Map) p['code'] as String,
    ];
    if (codes.isNotEmpty) return codes;
  }
  final source = File(_problemsTs).readAsStringSync();
  final list = RegExp(
    r'PROBLEM_CODES = \[(.*?)\] as const',
    dotAll: true,
  ).firstMatch(source)!.group(1)!;
  return [for (final m in RegExp(r"'([^']+)'").allMatches(list)) m.group(1)!];
}

void main() {
  final codes = _contractCodes();
  final languages = {
    for (final code in ['en', 'ar']) code: lookupAppLocalizations(Locale(code)),
  };

  group('MR-US2-S4 problem codes have words', () {
    test('the contract lists the codes this build knows', () {
      expect(codes, isNotEmpty);
      expect(
        ProblemCode.values.map((c) => c.wire).toSet(),
        codes.toSet(),
        reason: 'a new code needs a ProblemCode case and ARB strings',
      );
    });

    for (final MapEntry(key: language, value: l10n) in languages.entries) {
      test('every code maps to a specific message in $language', () {
        for (final code in codes) {
          final message = ServerFailure(
            statusCode: 400,
            code: code,
          ).message(l10n);
          expect(message, isNot(l10n.failureServer), reason: code);
          expect(message, isNotEmpty, reason: code);
        }
      });

      test('an unknown or missing code gives the general message '
          'in $language', () {
        expect(
          const ServerFailure(code: 'api.errors.fromTheFuture').message(l10n),
          l10n.failureServer,
        );
        expect(const ServerFailure().message(l10n), l10n.failureServer);
      });

      test('field-level codes share the invalid-input message '
          'in $language', () {
        for (final code in [
          'api.errors.invalidInput',
          'api.errors.invalidField',
          'api.errors.localeUnsupported',
        ]) {
          expect(
            ServerFailure(statusCode: 422, code: code).message(l10n),
            l10n.problemInvalidInput,
          );
        }
      });

      test('NotFoundFailure and the other failures in $language', () {
        expect(const NotFoundFailure().message(l10n), l10n.problemNotFound);
        expect(const NetworkFailure().message(l10n), l10n.failureNetwork);
        expect(const UnexpectedFailure().message(l10n), l10n.failureUnexpected);
      });
    }

    test('English and Arabic messages differ', () {
      for (final code in ProblemCode.values) {
        expect(
          code.message(languages['ar']!),
          isNot(code.message(languages['en']!)),
          reason: code.wire,
        );
      }
    });
  });
}
