import 'package:shoot_mobile/core/auth/session.dart';
import 'package:shoot_mobile/core/network/json_read.dart';
import 'package:shoot_mobile/features/content/data/models/editor_page_model.dart';
import 'package:shoot_mobile/features/content/data/models/guide_models.dart';
import 'package:shoot_mobile/features/content/data/models/legal_models.dart';
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

/// `site.ar` → `site`.
String exampleBaseName(String name) => name.split('.').first;

/// Problem documents (`problem-404`) decode through `apiGet`, not a model.
bool isProblemExample(String name) => name.startsWith('problem-');

/// Examples that are not API answers the app decodes (the association files
/// served under `.well-known`).
const nonApiExamples = {'app-links', 'apple-app-site-association'};
