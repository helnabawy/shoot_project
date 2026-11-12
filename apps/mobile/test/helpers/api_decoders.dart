import 'package:shoot_mobile/core/auth/session.dart';
import 'package:shoot_mobile/core/network/json_read.dart';
import 'package:shoot_mobile/features/brief/data/brief_data.dart';
import 'package:shoot_mobile/features/content/data/models/editor_page_model.dart';
import 'package:shoot_mobile/features/content/data/models/guide_models.dart';
import 'package:shoot_mobile/features/content/data/models/legal_models.dart';
import 'package:shoot_mobile/features/creators/data/models/creator_models.dart';
import 'package:shoot_mobile/features/landing/data/models/landing_model.dart';
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
};

/// `site.ar` → `site`.
String exampleBaseName(String name) => name.split('.').first;

/// Problem documents (`problem-404`) decode through `apiGet`, not a model.
bool isProblemExample(String name) => name.startsWith('problem-');

/// Examples that are not API answers the app decodes (the association files
/// served under `.well-known`).
const nonApiExamples = {'app-links', 'apple-app-site-association'};
