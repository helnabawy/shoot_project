import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/features/creators/data/models/creator_models.dart';
import 'package:shoot_mobile/features/creators/domain/entities/creators.dart';
import 'package:shoot_mobile/features/creators/presentation/cubit/profile_cubit.dart';
import 'package:shoot_mobile/features/site/data/models/brief_builder_model.dart';
import 'package:shoot_mobile/features/site/domain/entities/brief_builder.dart';

import 'api_examples.dart';
import 'pump_app.dart';

/// Examples of feature 011's screens, decoded from the shared contract examples.
typedef Patch = void Function(Map<String, dynamic> json);

const testWhatsapp = '+971501234567';

CreatorProfile exampleProfile([Patch? patch, String name = 'creator-profile']) {
  final json = loadExample(name);
  patch?.call(json);
  return CreatorProfileModel.fromJson(json).toEntity();
}

ProfileData exampleProfileData([Patch? patch, String? number = testWhatsapp]) =>
    ProfileData(profile: exampleProfile(patch), whatsappNumber: number);

CreatorList exampleCreatorList([Patch? patch]) {
  final json = loadExample('creators');
  patch?.call(json);
  return CreatorListModel.fromJson(json).toEntity();
}

SpecialtyPage exampleSpecialty([Patch? patch]) {
  final json = loadExample('specialty');
  patch?.call(json);
  return SpecialtyPageModel.fromJson(json).toEntity();
}

HirePage exampleHire([Patch? patch]) {
  final json = loadExample('hire-page');
  patch?.call(json);
  return HirePageModel.fromJson(json).toEntity();
}

BriefBuilderConfig exampleBriefConfig() =>
    BriefBuilderModel.fromJson(loadExample('brief-builder'))
        .toEntity()
        .builder!;

/// Pumps [widget] on a tall 360 px phone so a whole screen is laid out, in [locale].
Future<void> pumpScreen(
  WidgetTester tester,
  Widget widget, {
  Locale locale = const Locale('en'),
  double height = 2600,
}) async {
  await tester.binding.setSurfaceSize(Size(360, height));
  addTearDown(() => tester.binding.setSurfaceSize(null));
  await tester.pumpApp(widget, locale: locale);
  await tester.pump(const Duration(seconds: 1));
}
