import 'package:equatable/equatable.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/brief/domain/brief_draft.dart';
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

  /// Quick Match step 2 (`/match/{ref}/{key}`), or `null` when Quick Match is off.
  final String? matchPath;

  @override
  List<Object?> get props => [reference, sentence, whatsappUrl, matchPath];
}

/// Records a finished brief (feature 008's `POST briefs`, added by 010).
abstract interface class BriefRepository {
  Future<Result<BriefReceipt>> record(
    BriefBuilderConfig config,
    BriefDraft draft,
  );
}
