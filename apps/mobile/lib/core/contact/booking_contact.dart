import 'package:equatable/equatable.dart';
import 'package:shoot_mobile/core/network/json_read.dart';

/// Feature 025 (`bookingContactV1`): the other side of a paid booking, sent by the server only
/// to the booking's signed-in client (its booked creators) or to a creator whose own part is
/// confirmed (the client).
final class BookingContact extends Equatable {
  const BookingContact({
    required this.name,
    required this.role,
    required this.phone,
    required this.whatsappUrl,
  });

  factory BookingContact.fromJson(Json json) => BookingContact(
    name: readString(json, 'name'),
    role: readString(json, 'role'),
    phone: readString(json, 'phone'),
    whatsappUrl: readString(json, 'whatsappUrl'),
  );

  final String name;

  /// The professional type for a creator; empty for the client.
  final String role;

  /// The verified number, E.164 (`+971501234567`).
  final String phone;

  /// The WhatsApp chat with that person, a first line naming the booking written in.
  final String whatsappUrl;

  /// The phone app's address for the number.
  Uri get callUri => Uri(scheme: 'tel', path: phone);

  /// `+971 50 123 4567` for a UAE mobile; any other number as it is.
  String get display {
    final m = RegExp(r'^\+971(\d{2})(\d{3})(\d{4})$').firstMatch(phone);
    return m == null ? phone : '+971 ${m[1]} ${m[2]} ${m[3]}';
  }

  @override
  List<Object?> get props => [name, role, phone, whatsappUrl];
}
