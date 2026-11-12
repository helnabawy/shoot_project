import 'package:equatable/equatable.dart';
import 'package:shoot_mobile/core/network/json_read.dart';

/// Where a paged list is (`paginationV1`): [page] from 1, past the last page
/// the server answers the last page with its real number.
final class Pagination extends Equatable {
  const Pagination({
    required this.page,
    required this.pageCount,
    required this.total,
    required this.pageSize,
  });

  final int page;

  /// 0 when the list is empty.
  final int pageCount;
  final int total;
  final int pageSize;

  bool get hasNext => page < pageCount;

  @override
  List<Object?> get props => [page, pageCount, total, pageSize];
}

/// Decodes `paginationV1`. Throws [FormatException] on a missing field.
abstract final class PaginationModel {
  static Pagination read(Json json, String key) {
    final value = readObject(json, key);
    return Pagination(
      page: readInt(value, 'page'),
      pageCount: readInt(value, 'pageCount'),
      total: readInt(value, 'total'),
      pageSize: readInt(value, 'pageSize'),
    );
  }
}
