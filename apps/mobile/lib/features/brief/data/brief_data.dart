import 'package:dio/dio.dart';
import 'package:shoot_mobile/core/error/api_result.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/network/api_post.dart';
import 'package:shoot_mobile/core/network/json_read.dart';
import 'package:shoot_mobile/features/brief/domain/brief_draft.dart';
import 'package:shoot_mobile/features/brief/domain/brief_receipt.dart';
import 'package:shoot_mobile/features/site/domain/entities/brief_builder.dart';

/// The request body of `POST briefs` (`briefRecordV1`): one entry per chosen value, in the order
/// the slots appear and the values were picked. Labels are never sent; the server re-derives them.
Map<String, Object?> briefRecordBody(
  BriefBuilderConfig config,
  BriefDraft draft, {
  String? creator,
  Map<String, int>? budgets,
}) {
  return {
    'selections': [
      for (final slot in config.slots)
        if (slot.kind != SlotKind.date)
          for (final value in draft.valuesOf(slot.token))
            {'token': slot.token, 'value': value},
    ],
    'date': draft.date,
    'creator': ?creator,
    if (budgets != null && budgets.isNotEmpty)
      'budgets': [
        for (final e in budgets.entries)
          {'persona': e.key, 'amountFils': e.value},
      ],
  };
}

/// 022: the answers as the price endpoint reads them (slot token → value, several joined by a comma).
Map<String, Object?> briefPricesBody(
  BriefBuilderConfig config,
  BriefDraft draft,
) => {
  'values': {
    for (final slot in config.slots)
      if (draft.valuesOf(slot.token).isNotEmpty)
        slot.token: draft.valuesOf(slot.token).join(','),
  },
};

/// Decodes `briefReceiptV1`; throws [FormatException] on a missing field.
BriefReceipt briefReceiptFromJson(Json json) => BriefReceipt(
  reference: readString(json, 'reference'),
  sentence: readString(json, 'sentence'),
  whatsappUrl: readNullableString(json, 'whatsappUrl'),
  matchPath: readNullableString(json, 'matchPath'),
);

final class BriefRepositoryImpl implements BriefRepository {
  const BriefRepositoryImpl(this._dio);

  final Dio _dio;

  @override
  Future<Result<BriefReceipt>> record(
    BriefBuilderConfig config,
    BriefDraft draft, {
    String? creator,
    Map<String, int>? budgets,
  }) => apiResult(() async {
    final answer = await apiPost(
      _dio,
      'briefs',
      body: briefRecordBody(config, draft, creator: creator, budgets: budgets),
    );
    return briefReceiptFromJson(answer.body ?? const {});
  });

  @override
  Future<Result<List<BriefPrice>>> prices(
    BriefBuilderConfig config,
    BriefDraft draft,
  ) => apiResult(() async {
    final answer = await apiPost(
      _dio,
      'brief-builder/prices',
      body: briefPricesBody(config, draft),
    );
    return briefPricesFromJson(answer.body ?? const {});
  });
}

/// Decodes `briefPricesV1` (022); throws [FormatException] on a missing field.
List<BriefPrice> briefPricesFromJson(Json json) =>
    readList(json, 'prices', (o) {
      final p = asObject(o);
      return BriefPrice(
        persona: readString(p, 'persona'),
        suggestedFils: readNullableInt(p, 'suggestedFils'),
        minFils: readInt(p, 'minFils'),
        maxFils: readNullableInt(p, 'maxFils'),
      );
    });
