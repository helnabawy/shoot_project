import 'package:shoot_mobile/core/network/json_read.dart';
import 'package:shoot_mobile/features/creators/data/models/creator_models.dart';
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
  // US3
  'creators': (json) => CreatorListModel.fromJson(json).toEntity(),
  'creator-profile': (json) => CreatorProfileModel.fromJson(json).toEntity(),
  'specialty': (json) => SpecialtyPageModel.fromJson(json).toEntity(),
  'hire-page': (json) => HirePageModel.fromJson(json).toEntity(),
};

/// `site.ar` → `site`.
String exampleBaseName(String name) => name.split('.').first;

/// Problem documents (`problem-404`) decode through `apiGet`, not a model.
bool isProblemExample(String name) => name.startsWith('problem-');

/// Examples that are not API answers the app decodes (the association files
/// served under `.well-known`).
const nonApiExamples = {'app-links', 'apple-app-site-association'};
