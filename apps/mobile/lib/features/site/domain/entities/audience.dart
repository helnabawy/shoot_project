import 'package:equatable/equatable.dart';
import 'package:shoot_mobile/core/content/audience.dart';

/// The active audience (`personasV1`), in Site Settings order, with the
/// categories it offers, in [locale].
final class Audience extends Equatable {
  const Audience({
    required this.locale,
    required this.personas,
    required this.categories,
  });

  final String locale;
  final List<Persona> personas;
  final List<Category> categories;

  @override
  List<Object?> get props => [locale, personas, categories];
}
