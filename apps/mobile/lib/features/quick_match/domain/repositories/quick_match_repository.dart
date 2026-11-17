import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/quick_match/domain/entities/quick_match.dart';

/// Quick Match steps 2 to 4 and the booking pages (feature 012). Failures are `Failure`s: a wrong
/// key or an unknown reference is a `NotFoundFailure` (screen 37), a refused command a
/// `ServerFailure` whose `code` is a `booking.errors.*` key.
abstract interface class QuickMatchRepository {
  Future<Result<MatchPage>> getMatch(
    String ref,
    String key, {
    String? date,
    String? duration,
  });

  /// Needs a signed-in session (the caller's interceptor adds the token).
  Future<Result<QuotationIssued>> issueQuotation(
    String ref,
    String key,
    List<Pick> picks,
    BookingDetails details,
  );

  Future<Result<BookingView>> getBooking(String ref, String key);

  /// 022: decline one offer (by persona slug and creator code); answers step 2 again.
  Future<Result<MatchPage>> declineOffer(
    String ref,
    String key, {
    required String persona,
    required String creator,
  });

  /// 022: a fingerprint that changes when step 2's offers do.
  Future<Result<String>> matchStamp(String ref, String key);

  Future<Result<BookingView>> accept(String ref, String key);

  Future<Result<BookingView>> confirmDelivery(String ref, String key);

  Future<Result<BookingView>> report(String ref, String key, String reason);

  Future<Result<BookingView>> pickAnother(
    String ref,
    String key,
    String persona,
    String code,
  );

  Future<Result<FreshQuotation>> fresh(String ref, String key);

  /// Feature 020: the secure payment page for a confirmed booking (`checkoutV1.url`).
  Future<Result<String>> pay(String ref, String key);
}
