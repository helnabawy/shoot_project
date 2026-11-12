import 'package:equatable/equatable.dart';
import 'package:shoot_mobile/core/network/json_read.dart';

/// `meV1.accountType`. A value this build does not know reads as [unknown]
/// (v1 enums are additive).
enum AccountType { seeker, provider, unknown }

/// The signed-in member as the app keeps it: no phone number, no email
/// (data-model "App: stored session").
final class SessionUser extends Equatable {
  const SessionUser({
    required this.id,
    required this.name,
    required this.accountType,
  });

  /// Decodes `meV1` (`GET me`, the `user` of `otp/verify`). Throws
  /// [FormatException] on a missing or mistyped field; reads only what the
  /// app keeps.
  factory SessionUser.fromMe(Json json) {
    // Checked so a malformed answer fails here rather than later.
    readNullableString(json, 'phone');
    readStringList(json, 'personas');
    return SessionUser(
      id: readString(json, 'id'),
      name: readNullableString(json, 'name'),
      accountType: readEnum(
        json,
        'accountType',
        AccountType.values,
        AccountType.unknown,
      ),
    );
  }

  final String id;
  final String? name;
  final AccountType accountType;

  Json toJson() => {'id': id, 'name': name, 'accountType': accountType.name};

  @override
  List<Object?> get props => [id, name, accountType];
}

/// A Payload session token, when it expires, and who it belongs to.
final class Session extends Equatable {
  const Session({required this.token, required this.exp, required this.user});

  /// The `session.v1` value written by [toJson].
  factory Session.fromJson(Json json) {
    return Session(
      token: readString(json, 'token'),
      exp: _fromEpoch(readInt(json, 'exp')),
      user: SessionUser.fromMe({
        ...readObject(json, 'user'),
        'phone': null,
        'personas': const <String>[],
      }),
    );
  }

  /// `authTokenV1` (`otp/verify`): `{ token, exp, isNew, user }`.
  factory Session.fromAuthToken(Json json) {
    return Session(
      token: readString(json, 'token'),
      exp: _fromEpoch(readInt(json, 'exp')),
      user: SessionUser.fromMe(readObject(json, 'user')),
    );
  }

  final String token;

  /// When the token stops working (`exp`, seconds since the epoch, in UTC).
  final DateTime exp;
  final SessionUser user;

  Session copyWith({String? token, DateTime? exp, SessionUser? user}) =>
      Session(
        token: token ?? this.token,
        exp: exp ?? this.exp,
        user: user ?? this.user,
      );

  Json toJson() => {
    'token': token,
    'exp': exp.millisecondsSinceEpoch ~/ 1000,
    'user': user.toJson(),
  };

  // Never print the token.
  @override
  bool get stringify => false;

  @override
  List<Object?> get props => [token, exp, user];
}

DateTime _fromEpoch(int seconds) =>
    DateTime.fromMillisecondsSinceEpoch(seconds * 1000, isUtc: true);

/// `authRefreshV1` (`auth/refresh`): a new token for the same session.
typedef RefreshedToken = ({String token, DateTime exp});

RefreshedToken refreshedTokenFromJson(Json json) =>
    (token: readString(json, 'token'), exp: _fromEpoch(readInt(json, 'exp')));
