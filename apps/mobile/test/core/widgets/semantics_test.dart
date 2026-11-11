import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/widgets/calendar_month.dart';
import 'package:shoot_mobile/core/widgets/choice_chip.dart';
import 'package:shoot_mobile/core/widgets/creator_card.dart';
import 'package:shoot_mobile/core/widgets/picker_field.dart';
import 'package:shoot_mobile/core/widgets/progress_bar.dart';
import 'package:shoot_mobile/core/widgets/secondary_button.dart';
import 'package:shoot_mobile/core/widgets/segmented_control.dart';
import 'package:shoot_mobile/core/widgets/shoot_field.dart';
import 'package:shoot_mobile/core/widgets/shoot_row.dart';
import 'package:shoot_mobile/core/widgets/snap_carousel.dart';
import 'package:shoot_mobile/core/widgets/step_strip.dart';
import 'package:shoot_mobile/core/widgets/text_link.dart';
import 'package:shoot_mobile/core/widgets/top_hit.dart';

import '../../helpers/pump_app.dart';

void main() {
  late SemanticsHandle semantics;
  setUp(() {});

  Future<void> pump(
    WidgetTester tester,
    Widget child, {
    Locale locale = const Locale('en'),
  }) async {
    semantics = tester.ensureSemantics();
    await tester.pumpApp(
      Scaffold(body: Center(child: child)),
      locale: locale,
    );
    await tester.pumpAndSettle();
  }

  void check(WidgetTester tester, Finder f, Matcher m) {
    expect(tester.getSemantics(f), m);
  }

  testWidgets('MF-US3-S4 buttons and links announce name, role and state', (
    tester,
  ) async {
    await pump(
      tester,
      Column(
        children: [
          TopHit(label: 'Start a brief', onPressed: () {}),
          SecondaryButton(label: 'Change date', onPressed: () {}),
          const SecondaryButton(label: 'Off', onPressed: null),
          TextLink(label: 'Change number', onTap: () {}),
          ShootRow(label: 'Weddings', onTap: () {}, selected: true),
        ],
      ),
    );
    check(
      tester,
      find.byType(TopHit),
      isSemantics(
        label: 'Start a brief',
        isButton: true,
        isEnabled: true,
        hasEnabledState: true,
        hasTapAction: true,
      ),
    );
    check(
      tester,
      find.byType(SecondaryButton).first,
      isSemantics(
        label: 'Change date',
        isButton: true,
        isEnabled: true,
        hasTapAction: true,
      ),
    );
    check(
      tester,
      find.byType(SecondaryButton).last,
      isSemantics(
        label: 'Off',
        isButton: true,
        hasEnabledState: true,
        isEnabled: false,
      ),
    );
    check(
      tester,
      find.byType(TextLink),
      isSemantics(label: 'Change number', isLink: true, hasTapAction: true),
    );
    check(
      tester,
      find.byType(ShootRow),
      isSemantics(
        label: 'Weddings',
        isLink: true,
        isSelected: true,
        hasTapAction: true,
      ),
    );
    semantics.dispose();
  });

  testWidgets('MF-US3-S4 toggles, radio groups and tabs announce their state', (
    tester,
  ) async {
    await pump(
      tester,
      Column(
        children: [
          ShootChip(label: 'Weddings', on: true, onTap: () {}),
          SegmentedControl<int>(
            segments: const [(0, 'Photos'), (1, 'Video')],
            selected: 1,
            onChanged: (_) {},
          ),
          StepStrip(
            tabs: const [
              (label: 'Details', state: 'Done', tone: StepTone.done),
              (label: 'Samples', state: null, tone: StepTone.neutral),
            ],
            selected: 0,
            onSelect: (_) {},
          ),
          CreatorCard(
            label: 'Omar K.',
            chosen: true,
            onTap: () {},
            children: const [Text('Omar')],
          ),
        ],
      ),
    );
    check(
      tester,
      find.byType(ShootChip),
      isSemantics(
        label: 'Weddings',
        isButton: true,
        hasToggledState: true,
        isToggled: true,
      ),
    );
    check(
      tester,
      find.bySemanticsLabel('Video'),
      isSemantics(
        label: 'Video',
        isInMutuallyExclusiveGroup: true,
        hasCheckedState: true,
        isChecked: true,
      ),
    );
    check(
      tester,
      find.bySemanticsLabel('Photos'),
      isSemantics(
        label: 'Photos',
        isInMutuallyExclusiveGroup: true,
        hasCheckedState: true,
        isChecked: false,
      ),
    );
    check(
      tester,
      find.bySemanticsLabel('Details, Done'),
      isSemantics(
        label: 'Details, Done',
        isButton: true,
        isSelected: true,
        hasSelectedState: true,
      ),
    );
    check(
      tester,
      find.byType(CreatorCard),
      isSemantics(
        label: 'Omar K.',
        isButton: true,
        isSelected: true,
        hasSelectedState: true,
      ),
    );
    semantics.dispose();
  });

  testWidgets(
    'MF-US3-S4 fields announce their name; pickers their value and hint',
    (tester) async {
      await pump(
        tester,
        Column(
          children: [
            const ShootField(label: 'Your name'),
            PickerField(
              label: 'Emirate',
              value: 'Dubai',
              onTap: () {},
              opensHint: 'opens a list',
            ),
          ],
        ),
      );
      expect(find.bySemanticsLabel(RegExp('Your name')), findsWidgets);
      final text = tester
          .getSemantics(find.byType(TextField))
          .getSemanticsData();
      expect(text.flagsCollection.isTextField, isTrue);
      // The picker is its own button node, under the field frame's column.
      expect(
        find.semantics.byLabel('Emirate').evaluate().single,
        isSemantics(
          label: 'Emirate',
          value: 'Dubai',
          hint: 'opens a list',
          isButton: true,
          hasTapAction: true,
        ),
      );
      semantics.dispose();
    },
  );

  testWidgets(
    'MF-US3-S4 the carousel is adjustable and the progress bar has a value',
    (tester) async {
      await pump(
        tester,
        Column(
          children: [
            SizedBox(
              height: 200,
              child: SnapCarousel(
                height: 60,
                positionLabel: (n, m) => '${n + 1} of $m',
                children: [
                  CreatorCard(
                    label: 'A',
                    onTap: () {},
                    children: const [Text('A')],
                  ),
                  CreatorCard(
                    label: 'B',
                    onTap: () {},
                    children: const [Text('B')],
                  ),
                ],
              ),
            ),
            const ProgressBar(value: .6, label: 'Profile complete'),
          ],
        ),
      );
      expect(find.bySemanticsLabel(RegExp('Profile complete')), findsOneWidget);
      check(
        tester,
        find.byType(ProgressBar),
        isSemantics(label: 'Profile complete', value: '60%'),
      );
      final rail = find.byWidgetPredicate(
        (w) => w is Semantics && w.properties.value == '1 of 2',
      );
      check(
        tester,
        rail,
        isSemantics(
          value: '1 of 2',
          increasedValue: '2 of 2',
          hasIncreaseAction: true,
        ),
      );
      semantics.dispose();
    },
  );

  testWidgets(
    'MF-US3-S4 calendar days announce their state; booked days take no tap',
    (tester) async {
      await pump(
        tester,
        SizedBox(
          width: 320,
          child: CalendarMonth(
            month: DateTime(2026, 12),
            today: DateTime(2026, 12, 14),
            stateOf: (d) => d.day == 14 ? DayState.booked : DayState.free,
            dayLabel: (d, s) => '${d.day} December, ${s.name}',
            onDayTap: (_) {},
          ),
        ),
      );
      check(
        tester,
        find.bySemanticsLabel('14 December, booked'),
        isSemantics(label: '14 December, booked'),
      );
      check(
        tester,
        find.bySemanticsLabel('15 December, free'),
        isSemantics(
          label: '15 December, free',
          isButton: true,
          hasTapAction: true,
        ),
      );
      semantics.dispose();
    },
  );
}
