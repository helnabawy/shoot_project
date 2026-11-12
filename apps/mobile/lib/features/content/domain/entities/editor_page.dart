import 'package:equatable/equatable.dart';
import 'package:shoot_mobile/core/content/sections.dart';

/// A page built by an editor (`pageV1`). [path] is its current address in
/// the answer's language, which differs from the one asked for after a
/// rename; screens skip an `UnknownSection`.
final class EditorPage extends Equatable {
  const EditorPage({
    required this.locale,
    required this.path,
    required this.title,
    required this.sections,
  });

  final String locale;
  final String path;
  final String title;
  final List<Section> sections;

  @override
  List<Object?> get props => [locale, path, title, sections];
}
