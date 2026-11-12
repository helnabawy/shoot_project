import 'package:shoot_mobile/core/routing/app_routes.dart';

/// Where a booking opens: the website's `/account/bookings/{ref}`, which feature 012's quotation
/// and booking screens (12, 13, 14, 40) fill. Until they land a stand-in page answers it.
String bookingPath(String reference) =>
    '${AppRoutes.accountBookings}/${Uri.encodeComponent(reference)}';
