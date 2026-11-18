import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/creator_home/domain/entities/creator_home.dart';

/// The creator home (feature 023): one read, and the two answers it offers. Each answer is the one the
/// creator's bookings page or inbox gives; the home is read again afterwards.
abstract interface class CreatorHomeRepository {
  Future<Result<CreatorHome>> home();

  Future<Result<void>> answerBooking(
    String ref, {
    required bool confirm,
    String? reason,
  });

  Future<Result<void>> answerBrief(
    String ref, {
    required String persona,
    required bool accept,
    String? reason,
    String? note,
  });
}
