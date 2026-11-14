import 'package:shoot_mobile/core/auth/session.dart';
import 'package:shoot_mobile/core/network/json_read.dart';
import 'package:shoot_mobile/features/account/data/models/account_models.dart';
import 'package:shoot_mobile/features/brief/data/brief_data.dart';
import 'package:shoot_mobile/features/content/data/models/editor_page_model.dart';
import 'package:shoot_mobile/features/content/data/models/guide_models.dart';
import 'package:shoot_mobile/features/content/data/models/legal_models.dart';
import 'package:shoot_mobile/features/creator_account/data/models/creator_account_models.dart';
import 'package:shoot_mobile/features/creator_account/data/models/inbox_models.dart';
import 'package:shoot_mobile/features/creators/data/models/creator_models.dart';
import 'package:shoot_mobile/features/landing/data/models/landing_model.dart';
import 'package:shoot_mobile/features/quick_match/data/models/quick_match_models.dart';
import 'package:shoot_mobile/features/sign_in/data/models/otp_models.dart';
import 'package:shoot_mobile/features/site/data/models/audience_model.dart';
import 'package:shoot_mobile/features/site/data/models/brief_builder_model.dart';
import 'package:shoot_mobile/features/site/data/models/navigation_model.dart';
import 'package:shoot_mobile/features/site/data/models/site_info_model.dart';

/// From an example's base name (`site` for `site.json` and `site.ar.json`)
/// to its model: `fromJson`, then `toEntity()`. Every story adds its rows
/// (feature 008, MR-US2-S3); `api_examples_test.dart` fails for a file
/// without one.
final Map<String, Object Function(Json json)> apiDecoders = {
  'site': (json) => SiteInfoModel.fromJson(json).toEntity(),
  'navigation': (json) => NavigationModel.fromJson(json).toEntity(),
  'personas': (json) => AudienceModel.fromJson(json).toEntity(),
  'brief-builder': (json) => BriefBuilderModel.fromJson(json).toEntity(),
  'landing': (json) => LandingModel.fromJson(json).toEntity(),
  // 009: sign-in by one-time code (answers, and the bodies the app sends).
  'auth-challenge': (json) => OtpChallengeModel.fromJson(json).toEntity(),
  'auth-token': (json) => AuthTokenModel.fromJson(json).toEntity(),
  'auth-refresh': refreshedTokenFromJson,
  'me-seeker': SessionUser.fromMe,
  'me-provider': SessionUser.fromMe,
  'auth-request': (json) => OtpRequestModel.fromJson(json).toJson(),
  'auth-verify-seeker': (json) => OtpVerifyModel.fromJson(json).toJson(),
  'auth-verify-provider': (json) => OtpVerifyModel.fromJson(json).toJson(),
  'auth-verify-sign-in': (json) => OtpVerifyModel.fromJson(json).toJson(),
  // 013: the client account.
  'me-account': (json) => AccountHomeModel.fromJson(json).toEntity(),
  'me-account-empty': (json) => AccountHomeModel.fromJson(json).toEntity(),
  'me-bookings': (json) => BookingListModel.fromJson(json).toEntity(),
  'me-briefs': (json) => BriefListModel.fromJson(json).toEntity(),
  'me-updated': SessionUser.fromMe,
  'me-update-request': (json) => MeUpdateModel.fromJson(json).toJson(),
  // 010: recording a brief.
  'brief-receipt': briefReceiptFromJson,
  'brief-record': (json) => {
    'selections': [
      for (final s in json['selections']! as List)
        {'token': (s! as Json)['token'], 'value': (s as Json)['value']},
    ],
    'date': json['date'],
  },
  // US3
  'creators': (json) => CreatorListModel.fromJson(json).toEntity(),
  'creator-profile': (json) => CreatorProfileModel.fromJson(json).toEntity(),
  'specialty': (json) => SpecialtyPageModel.fromJson(json).toEntity(),
  'hire-page': (json) => HirePageModel.fromJson(json).toEntity(),
  // US4: guides, editor pages and legal documents.
  'guides': (json) => GuideListModel.fromJson(json).toEntity(),
  'guide': (json) => ArticleModel.fromJson(json).toEntity(),
  'page': (json) => EditorPageModel.fromJson(json).toEntity(),
  'legal': (json) => LegalDocumentModel.fromJson(json).toEntity(),
  'legal-versions': (json) => LegalVersionsModel.fromJson(json).toEntity(),
  'legal-version': (json) => LegalDocumentModel.fromJson(json).toEntity(),
  // 014: the creator's own account (answers, and the request bodies the app sends).
  'creator-profile-draft': (json) => MyProfileModel.fromJson(json).toEntity(),
  'creator-profile-ready': (json) => MyProfileModel.fromJson(json).toEntity(),
  'creator-profile-review': (json) => MyProfileModel.fromJson(json).toEntity(),
  'creator-profile-saved': (json) => MyProfileModel.fromJson(json).toEntity(),
  'creator-profile-submitted': (json) =>
      MyProfileModel.fromJson(json).toEntity(),
  'creator-profile-hidden': (json) => MyProfileModel.fromJson(json).toEntity(),
  'creator-photo-result': (json) => MyProfileModel.fromJson(json).toEntity(),
  'creator-sample-result': (json) => MyProfileModel.fromJson(json).toEntity(),
  'creator-sample-removed': (json) => MyProfileModel.fromJson(json).toEntity(),
  'creator-identity-result': (json) => MyProfileModel.fromJson(json).toEntity(),
  'creator-bookings': (json) => CreatorBookingsModel.fromJson(json).toEntity(),
  'creator-bookings-answered': (json) =>
      CreatorBookingsModel.fromJson(json).toEntity(),
  'creator-bookings-delivered': (json) =>
      CreatorBookingsModel.fromJson(json).toEntity(),
  'creator-bookings-read': (json) =>
      CreatorBookingsModel.fromJson(json).toEntity(),
  'creator-availability': (json) => AvailabilityModel.fromJson(json).toEntity(),
  'creator-availability-set-result': (json) =>
      AvailabilityModel.fromJson(json).toEntity(),
  'creator-account': (json) => CreatorAccountModel.fromJson(json).toEntity(),
  // 019: the creator brief inbox and app push.
  'creator-account-briefs': (json) =>
      CreatorAccountModel.fromJson(json).toEntity(),
  'creator-briefs': (json) => CreatorInboxModel.fromJson(json).toEntity(),
  'creator-briefs-answered': (json) =>
      CreatorInboxModel.fromJson(json).toEntity(),
  'creator-briefs-withdrawn': (json) =>
      CreatorInboxModel.fromJson(json).toEntity(),
  'creator-brief-answer': (json) => only(json, {'persona', 'decision'}),
  'creator-brief-reject': (json) =>
      only(json, {'persona', 'decision', 'reason', 'note'}),
  'push-device': (json) => only(json, {'token', 'platform', 'locale'}),
  'push-preference': (json) => only(json, {'enabled'}),
  'push-preference-set': (json) => only(json, {'enabled'}),
  'push-preference-request': (json) => only(json, {'enabled'}),
  'creator-profile-patch': (json) => only(json, {
    'displayName',
    'bio',
    'gender',
    'nationality',
    'yearsExperience',
    'professions',
    'specialties',
    'emirates',
    'languages',
    'social',
  }),
  'creator-visibility': (json) => only(json, {'hidden'}),
  'creator-upload-photo': (json) =>
      only(json, {'contentType', 'filename', 'data'}),
  'creator-upload-identity': (json) =>
      only(json, {'contentType', 'filename', 'data'}),
  'creator-sample-add': (json) => {
    ...only(json, {'kind', 'videoUrl', 'specialty'}),
    'caption': only(asObject(json['caption']), {'en', 'ar'}),
    'file': only(asObject(json['file']), {'contentType', 'filename', 'data'}),
  },
  'creator-availability-set': (json) => only(json, {'blocked'}),
  'creator-answer': (json) => only(json, {'decision', 'reason'}),
  // 012: Quick Match and booking.
  'match': (json) => MatchPageModel.fromJson(json).toEntity(),
  'match-none-free': (json) => MatchPageModel.fromJson(json).toEntity(),
  'quotation-issued': (json) => QuotationIssuedModel.fromJson(json).toEntity(),
  'fresh-quotation': (json) => FreshQuotationModel.fromJson(json).toEntity(),
  'booking-view-quoted': (json) => BookingViewModel.fromJson(json).toEntity(),
  'booking-view-accepted': (json) => BookingViewModel.fromJson(json).toEntity(),
  'booking-view-lapsed': (json) => BookingViewModel.fromJson(json).toEntity(),
  'booking-view-reassigned': (json) =>
      BookingViewModel.fromJson(json).toEntity(),
  'booking-view-confirmed': (json) =>
      BookingViewModel.fromJson(json).toEntity(),
  'booking-view-delivered': (json) =>
      BookingViewModel.fromJson(json).toEntity(),
  'booking-view-completed': (json) =>
      BookingViewModel.fromJson(json).toEntity(),
  'booking-view-expired': (json) => BookingViewModel.fromJson(json).toEntity(),
  'booking-view-on-hold': (json) => BookingViewModel.fromJson(json).toEntity(),
  // The bodies the app sends: each must read as the shapes the app builds.
  'quotation-request': (json) =>
      ((json['picks']! as List).length, (json['details']! as Map)['venue']),
  'report-request': (json) => json['reason']! as String,
  'pick-another-request': (json) => json['code']! as String,
};

/// The request bodies the app sends: only the fields v1 knows, so an extra one changes nothing.
Map<String, Object?> only(Json json, Set<String> keys) => {
  for (final k in keys)
    if (json.containsKey(k)) k: json[k],
};

/// `site.ar` → `site`.
String exampleBaseName(String name) => name.split('.').first;

/// Problem documents (`problem-404`) decode through `apiGet`, not a model.
bool isProblemExample(String name) => name.startsWith('problem-');

/// Examples that are not API answers the app decodes (the association files
/// served under `.well-known`).
const nonApiExamples = {'app-links', 'apple-app-site-association'};
