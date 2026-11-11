import 'package:equatable/equatable.dart';
import 'package:shoot_mobile/core/network/json_read.dart';

/// One stored size of an image: an absolute [url] and its pixel size.
final class ImageSize extends Equatable {
  const ImageSize({
    required this.url,
    required this.width,
    required this.height,
  });

  final String url;
  final int width;
  final int height;

  @override
  List<Object?> get props => [url, width, height];
}

/// An image from the API (`imageV1`): its alternative text, the original's
/// size, and every stored size sorted by width ascending (never empty).
final class ImageRef extends Equatable {
  const ImageRef({
    required this.alt,
    required this.width,
    required this.height,
    required this.sizes,
  });

  final String alt;
  final int width;
  final int height;
  final List<ImageSize> sizes;

  double get aspectRatio => width / height;

  /// The smallest size at least [targetPx] device pixels wide, else the
  /// largest. Pass the rendered width times the device pixel ratio.
  ImageSize pick(double targetPx) {
    for (final size in sizes) {
      if (size.width >= targetPx) return size;
    }
    return sizes.last;
  }

  @override
  List<Object?> get props => [alt, width, height, sizes];
}

/// Decodes `imageV1`. Throws [FormatException] on a missing or mistyped
/// field, or when there is no size at all.
final class ImageRefModel {
  const ImageRefModel._(this._entity);

  factory ImageRefModel.fromJson(Json json) {
    final sizes = readList(json, 'sizes', (item) {
      final size = asObject(item);
      return ImageSize(
        url: readString(size, 'url'),
        width: readInt(size, 'width'),
        height: readInt(size, 'height'),
      );
    })..sort((a, b) => a.width.compareTo(b.width));
    if (sizes.isEmpty) {
      throw const FormatException('Expected at least one size at "sizes"');
    }
    return ImageRefModel._(
      ImageRef(
        alt: readString(json, 'alt'),
        width: readInt(json, 'width'),
        height: readInt(json, 'height'),
        sizes: List.unmodifiable(sizes),
      ),
    );
  }

  final ImageRef _entity;

  ImageRef toEntity() => _entity;
}
