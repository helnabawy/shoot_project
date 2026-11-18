// The plan names screen goldens by board number (`<id>_<name>_golden_test.dart`).
// ignore_for_file: file_names
@Tags(['golden'])
library;

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/features/creator_home/data/models/creator_home_model.dart';
import 'package:shoot_mobile/features/creator_home/domain/entities/creator_home.dart';
import 'package:shoot_mobile/features/creator_home/presentation/cubit/creator_home_cubit.dart';
import 'package:shoot_mobile/features/creator_home/presentation/pages/creator_home_page.dart';

import '../../helpers/api_examples.dart';
import '../../helpers/golden.dart';

/// The boards show the scene tile, never a photo, so the examples are drawn without theirs.
CreatorHome board(String example) {
  final home = CreatorHomeModel.fromJson(loadExample(example)).toEntity();
  return CreatorHome(
    name: home.name,
    code: home.code,
    professions: home.professions,
    photo: null,
    mode: home.mode,
    needs: home.needs,
    counts: home.counts,
    queue: home.queue,
    next: home.next,
    today: home.today,
    reasons: home.reasons,
  );
}

Widget view(CreatorHome home) => CreatorHomeView(
  state: CreatorHomeLoaded(home),
  // The boards' clock: the answer-by time reads "Answer by 18:00" on the day it is due.
  now: DateTime.utc(2026, 11, 18, 10),
  onRetry: () {},
  onRefresh: () async {},
  onAccept: (_) {},
  onDecline: (_) {},
  onOpen: (_) {},
);

void main() {
  final screens = {
    '64': 'creator-home',
    '65': 'creator-home-clear',
    '67': 'creator-home-not-live',
  };

  for (final MapEntry(key: id, value: example) in screens.entries) {
    for (final variant in Variant.values) {
      testWidgets(
        'CH-US1-S1 screen $id renders to its board in ${variant.id}',
        (tester) => pumpBoard(
          tester,
          id: id,
          variant: variant,
          child: view(board(example)),
        ),
        skip: !goldensEnabled,
      );
    }

    testWidgets(
      'screen $id self-baselines: no overflow at 393, 430, iPad and text scale 2',
      (tester) =>
          pumpSelfBaselines(tester, id: id, child: view(board(example))),
      skip: !goldensEnabled,
    );
  }
}
