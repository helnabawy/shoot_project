import 'package:equatable/equatable.dart';
import 'package:shoot_mobile/core/auth/session.dart';

/// What a new account becomes (`signupV1`, research R12). Used by the server
/// only when the number has no account yet.
final class SignupChoice extends Equatable {
  const SignupChoice.seeker({this.name})
    : accountType = AccountType.seeker,
      personas = const [],
      acceptTerms = false;

  const SignupChoice.provider({
    required this.personas,
    required this.acceptTerms,
    this.name,
  }) : accountType = AccountType.provider;

  final AccountType accountType;

  /// Persona slugs (from `GET personas`), required for a provider.
  final List<String> personas;
  final String? name;
  final bool acceptTerms;

  @override
  List<Object?> get props => [accountType, personas, name, acceptTerms];
}
