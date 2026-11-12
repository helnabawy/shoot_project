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
  BriefDraft draft,
) {
  return {
    'selections': [
      for (final slot in config.slots)
        if (slot.kind != SlotKind.date)
          for (final value in draft.valuesOf(slot.token))
            {'token': slot.token, 'value': value},
    ],
    'date': draft.date,
  };
}

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
    BriefDraft draft,
  ) => apiResult(() async {
    final answer = await apiPost(
      _dio,
      'briefs',
      body: briefRecordBody(config, draft),
    );
    return briefReceiptFromJson(answer.body ?? const {});
  });
}
