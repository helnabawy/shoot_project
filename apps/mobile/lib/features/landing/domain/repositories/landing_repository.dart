import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/landing/domain/entities/landing.dart';

/// The landing, in the app's current language (sent on every request).
abstract interface class LandingRepository {
  Future<Result<Landing>> getLanding();
}
