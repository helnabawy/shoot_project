import 'package:shoot_mobile/core/network/json_read.dart';
import 'package:shoot_mobile/features/content/data/models/editor_page_model.dart';
import 'package:shoot_mobile/features/content/data/models/guide_models.dart';
import 'package:shoot_mobile/features/content/data/models/legal_models.dart';
import 'package:shoot_mobile/features/landing/data/models/landing_model.dart';
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
