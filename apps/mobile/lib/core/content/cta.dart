import 'package:equatable/equatable.dart';
import 'package:shoot_mobile/core/network/json_read.dart';

/// What a call to action does, so the app can pick its icon. A value this
/// build does not know reads as [unknown].
enum CtaKind { whatsapp, link, call, unknown }

/// A resolved call to action (`ctaV1`): a site [path] without language prefix
/// (`/creators`) or an absolute [url] (the WhatsApp link, `tel:`, a web
/// address). The server sends exactly one of them.
final class Cta extends Equatable {
  const Cta({
    required this.label,
    required this.kind,
    required this.path,
    required this.url,
  });

  final String label;
  final CtaKind kind;
  final String? path;
  final String? url;

  @override
  List<Object?> get props => [label, kind, path, url];
}

/// Decodes `ctaV1`. Throws [FormatException] on a missing or mistyped field.
final class CtaModel {
  const CtaModel._(this._entity);

  factory CtaModel.fromJson(Json json) {
    return CtaModel._(
      Cta(
        label: readString(json, 'label'),
        kind: readEnum(json, 'kind', CtaKind.values, CtaKind.unknown),
        path: readNullableString(json, 'path'),
        url: readNullableString(json, 'url'),
      ),
    );
  }

  /// A nullable `ctaV1` at [key].
  static Cta? readNullable(Json json, String key) {
    final value = readNullableObject(json, key);
    return value == null ? null : CtaModel.fromJson(value).toEntity();
  }

  final Cta _entity;

  Cta toEntity() => _entity;
}
