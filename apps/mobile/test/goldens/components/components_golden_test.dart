@Tags(['golden'])
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/gallery/catalogue.dart';

import '../../helpers/golden.dart';

/// Self-baselines for every catalogue component in each of its states, in the four variants, at
/// 360 wide (T047). They sit beside the board comparisons of the screens that use them.
void main() {
  for (final entry in catalogue.where((e) => !e.animates)) {
    for (final variant in Variant.values) {
      testWidgets(
        'component ${entry.name} in ${variant.id}',
        (tester) => pumpComponent(
          tester,
          name: entry.name,
          variant: variant,
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              spacing: 16,
              children: [
                for (final build in entry.states.values)
                  Builder(builder: build),
              ],
            ),
          ),
        ),
        skip: !goldensEnabled,
      );
    }
  }
}
