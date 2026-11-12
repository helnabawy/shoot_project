import 'package:equatable/equatable.dart';
import 'package:shoot_mobile/core/network/json_read.dart';

/// Where a paged list stands (`paginationV1`): [page] runs from 1 to
/// `max(pageCount, 1)`; an empty list has [pageCount] 0.
final class Pagination extends Equatable {
  const Pagination({
    required this.page,
    required this.pageCount,
    required this.total,
    required this.pageSize,
  });

  final int page;
  final int pageCount;
  final int total;
  final int pageSize;

  bool get hasNext => page < pageCount;
  bool get hasPrevious => page > 1;

  @override
  List<Object?> get props => [page, pageCount, total, pageSize];
}

/// Decodes `paginationV1`. Throws [FormatException] on a missing or mistyped
/// field.
final class PaginationModel {
  const PaginationModel._(this._entity);

  factory PaginationModel.fromJson(Json json) {
    return PaginationModel._(
      Pagination(
        page: readInt(json, 'page'),
        pageCount: readInt(json, 'pageCount'),
        total: readInt(json, 'total'),
        pageSize: readInt(json, 'pageSize'),
      ),
    );
  }

  /// A required `paginationV1` at [key].
  static Pagination read(Json json, String key) {
    return PaginationModel.fromJson(readObject(json, key)).toEntity();
  }

  final Pagination _entity;

  Pagination toEntity() => _entity;
}
