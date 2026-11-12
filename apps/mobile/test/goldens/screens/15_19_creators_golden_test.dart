// The plan names screen goldens by board number (`<id>_<name>_golden_test.dart`).
// ignore_for_file: file_names
@Tags(['golden'])
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/features/creators/domain/entities/creators.dart';
import 'package:shoot_mobile/features/creators/presentation/cubit/book_hire_cubits.dart';
import 'package:shoot_mobile/features/creators/presentation/cubit/brief_cubit.dart';
import 'package:shoot_mobile/features/creators/presentation/cubit/directory_cubit.dart';
import 'package:shoot_mobile/features/creators/presentation/cubit/specialty_cubit.dart';
import 'package:shoot_mobile/features/creators/domain/usecases/get_brief_context.dart';
import 'package:shoot_mobile/features/creators/presentation/pages/book_page.dart';
import 'package:shoot_mobile/features/creators/presentation/pages/directory_page.dart';
import 'package:shoot_mobile/features/creators/presentation/pages/hire_page.dart';
import 'package:shoot_mobile/features/creators/presentation/pages/profile_page.dart';
import 'package:shoot_mobile/features/creators/presentation/pages/specialty_page.dart';
import 'package:shoot_mobile/features/site/data/models/brief_builder_model.dart';

import '../../helpers/api_examples.dart';
import '../../helpers/creators_fixtures.dart';
import '../../helpers/golden.dart';

Widget _directory() {
  final list = exampleCreatorList();
  return DirectoryView(
    state: DirectoryState(
      status: DirectoryStatus.ready,
      items: list.items,
      filters: list.filters,
      pagination: list.pagination,
    ),
    onSelect: (_, _) {},
    onShowMore: () {},
    onRetry: () {},
    onOpen: (_) {},
    onBrief: () {},
  );
}

Widget _profile() => ProfileView(
  data: exampleProfileData(),
  onBack: () {},
  onBook: () {},
  onShare: () {},
  onWhatsapp: () {},
  onLink: (_) {},
  onSample: (_, _) {},
);

Widget _book() => BookView(
  data: BookData(
    profile: exampleProfile(),
    context: BriefContext(
      builder: BriefBuilderModel.fromJson(loadExample('brief-builder'))
          .toEntity()
          .builder,
      whatsappNumber: testWhatsapp,
    ),
  ),
  draft: BriefDraft()
    ..values = {'persona': 'photographer', 'occasion': 'wedding'},
  today: '2026-11-12',
  open: (_) async => true,
  onBack: () {},
  onChange: () {},
);

Widget _specialty() => SpecialtyScreen(
  view: SpecialtyView(page: exampleSpecialty(), place: 'Dubai'),
  onPlace: (_) {},
  onCreator: (_) {},
  onSeeAll: () {},
  onBrief: () {},
  onBack: () {},
);

Widget _hire() => HireView(
  data: HireData(
    page: exampleHire(),
    whatsappNumber: testWhatsapp,
    expanded: 0,
  ),
  today: '2026-11-12',
  open: (_) async => true,
  onToggle: (_) {},
  onCreator: (_) {},
  onSeeAll: (_) {},
);

void main() {
  final screens = <String, Widget Function()>{
    '15': _directory,
    '16': _profile,
    '17': _book,
    '18': _specialty,
    '19': _hire,
  };
  for (final MapEntry(key: id, value: build) in screens.entries) {
    for (final variant in Variant.values) {
      testWidgets(
        'MC-FR060 screen $id renders to its board in ${variant.id}',
        (tester) => pumpBoard(tester, id: id, variant: variant, child: build()),
        skip: !goldensEnabled,
      );
    }
    testWidgets(
      'MC-FR060 screen $id self-baselines: no overflow at 393, 430, iPad and text scale 2',
      (tester) => pumpSelfBaselines(tester, id: id, child: build()),
      skip: !goldensEnabled,
    );
  }
}
