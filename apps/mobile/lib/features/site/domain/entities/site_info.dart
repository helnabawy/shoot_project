import 'package:equatable/equatable.dart';
import 'package:shoot_mobile/core/content/links.dart';
import 'package:shoot_mobile/core/media/image_ref.dart';

/// The WhatsApp contact from Site Settings. Each value is `null` when unset.
final class WhatsAppContact extends Equatable {
  const WhatsAppContact({
    required this.number,
    required this.defaultMessage,
    required this.expectedReplyTime,
  });

  /// E.164 (`+971501234567`).
  final String? number;
  final String? defaultMessage;
  final String? expectedReplyTime;

  @override
  List<Object?> get props => [number, defaultMessage, expectedReplyTime];
}

/// The account-type labels with persona placeholders already filled in.
final class AccountLabels extends Equatable {
  const AccountLabels({required this.seeker, required this.provider});

  final String? seeker;
  final String? provider;

  @override
  List<Object?> get props => [seeker, provider];
}

/// The site settings the app may know (`siteV1`), in [locale] (`en`, `ar`).
final class SiteInfo extends Equatable {
  const SiteInfo({
    required this.locale,
    required this.siteName,
    required this.logo,
    required this.logoDark,
    required this.whatsapp,
    required this.phone,
    required this.contactEmail,
    required this.social,
    required this.labels,
    required this.creatorCodePrefix,
    required this.quickMatchEnabled,
  });

  final String locale;
  final String siteName;
  final ImageRef? logo;
  final ImageRef? logoDark;
  final WhatsAppContact whatsapp;

  /// E.164, or `null` when unset.
  final String? phone;
  final String? contactEmail;

  /// Each link's label is its platform: `instagram`, `linkedin`, `youtube`,
  /// `tiktok`, `x`.
  final List<ExternalLink> social;
  final AccountLabels labels;
  final String creatorCodePrefix;
  final bool quickMatchEnabled;

  @override
  List<Object?> get props => [
    locale,
    siteName,
    logo,
    logoDark,
    whatsapp,
    phone,
    contactEmail,
    social,
    labels,
    creatorCodePrefix,
    quickMatchEnabled,
  ];
}
