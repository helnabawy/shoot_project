import 'package:equatable/equatable.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/brief/domain/brief_draft.dart';
import 'package:shoot_mobile/features/brief/domain/place.dart';
import 'package:shoot_mobile/features/site/domain/entities/brief_builder.dart';

/// What the server answers when a brief is recorded (`briefReceiptV1`).
final class BriefReceipt extends Equatable {
  const BriefReceipt({
    required this.reference,
    required this.sentence,
    required this.whatsappUrl,
    required this.matchPath,
  });

  final String reference;
  final String sentence;
  final String? whatsappUrl;

  /// Quick Match step 2 (`/match/{ref}/{key}`; for a creator's brief their details step with
  /// `?pick=`), or `null` when Quick Match is off.
  final String? matchPath;

  @override
  List<Object?> get props => [reference, sentence, whatsappUrl, matchPath];
}

/// Records a finished brief (feature 008's `POST briefs`, added by 010). [creator] (011 FR-021):
/// the code of the creator a "Book with …" brief is for; [BriefReceipt.matchPath] then opens their
/// details step.
abstract interface class BriefRepository {
  /// [budgets]: 022, the client's price per professional type (persona slug → fils).
  Future<Result<BriefReceipt>> record(
    BriefBuilderConfig config,
    BriefDraft draft, {
    String? creator,
    Map<String, int>? budgets,
    PlacePin? place,
  });

  /// 022: the usual price and the allowed range per type for a complete draft.
  Future<Result<List<BriefPrice>>> prices(
    BriefBuilderConfig config,
    BriefDraft draft,
  );
}

/// 022: one professional type's usual price and range (whole fils). `suggestedFils` is `null` when
/// no package fits the duration or place; then any price from [minFils] goes.
final class BriefPrice extends Equatable {
  const BriefPrice({
    required this.persona,
    required this.suggestedFils,
    required this.minFils,
    required this.maxFils,
  });

  final String persona;
  final int? suggestedFils;
  final int minFils;
  final int? maxFils;

  int clamp(int fils) {
    final rounded = (fils ~/ 100) * 100;
    final low = rounded < minFils ? minFils : rounded;
    return maxFils != null && low > maxFils! ? maxFils! : low;
  }

  @override
  List<Object?> get props => [persona, suggestedFils, minFils, maxFils];
}
