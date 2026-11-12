import 'package:equatable/equatable.dart';
import 'package:shoot_mobile/core/content/rich_text.dart';

/// A legal document kind (`legalKindV1`). A value this build does not know
/// reads as [unknown].
enum LegalKind {
  terms('terms'),
  professionalTerms('professional-terms'),
  privacy('privacy'),
  unknown('unknown');

  const LegalKind(this.wire);

  /// The name in the API path and answers.
  final String wire;

  static LegalKind fromWire(String value) {
    for (final kind in values) {
      if (kind.wire == value) return kind;
    }
    return unknown;
  }
}

/// A published version of a legal document that starts later.
final class UpcomingLegalVersion extends Equatable {
  const UpcomingLegalVersion({
    required this.version,
    required this.effectiveFrom,
  });

  final int version;
  final DateTime effectiveFrom;

  @override
  List<Object?> get props => [version, effectiveFrom];
}

/// One version of a legal document (`legalVersionV1`, and `legalDocumentV1`
/// with [upcoming]). Times are UTC; [until] is `null` for the latest.
final class LegalDocument extends Equatable {
  const LegalDocument({
    required this.locale,
    required this.kind,
    required this.title,
    required this.version,
    required this.effectiveFrom,
    required this.until,
    required this.body,
    required this.inRequestedLanguage,
    this.upcoming,
  });

  final String locale;
  final LegalKind kind;
  final String title;
  final int version;
  final DateTime effectiveFrom;
  final DateTime? until;
  final RichTextDocument body;
  final bool inRequestedLanguage;

  /// Only on the version in force: a later published version, if any.
  final UpcomingLegalVersion? upcoming;

  @override
  List<Object?> get props => [
    locale,
    kind,
    title,
    version,
    effectiveFrom,
    until,
    body,
    inRequestedLanguage,
    upcoming,
  ];
}

/// One row of a document's version list.
final class LegalVersionEntry extends Equatable {
  const LegalVersionEntry({
    required this.version,
    required this.from,
    required this.until,
    required this.changeSummary,
  });

  final int version;
  final DateTime from;
  final DateTime? until;
  final String? changeSummary;

  @override
  List<Object?> get props => [version, from, until, changeSummary];
}

/// Every published version of a document, newest first (`legalVersionsV1`).
final class LegalVersions extends Equatable {
  const LegalVersions({
    required this.locale,
    required this.kind,
    required this.title,
    required this.versions,
  });

  final String locale;
  final LegalKind kind;
  final String title;
  final List<LegalVersionEntry> versions;

  @override
  List<Object?> get props => [locale, kind, title, versions];
}
