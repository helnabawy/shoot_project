import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/content/pagination.dart';
import 'package:shoot_mobile/core/widgets/top_hit.dart';
import 'package:shoot_mobile/features/creators/domain/entities/creators.dart';
import 'package:shoot_mobile/features/creators/presentation/cubit/book_hire_cubits.dart';
import 'package:shoot_mobile/features/creators/presentation/cubit/directory_cubit.dart';
import 'package:shoot_mobile/features/creators/presentation/cubit/specialty_cubit.dart';
import 'package:shoot_mobile/features/creators/presentation/pages/directory_page.dart';
import 'package:shoot_mobile/features/creators/presentation/pages/hire_page.dart';
import 'package:shoot_mobile/features/creators/presentation/pages/specialty_page.dart';

import '../../../../helpers/creators_fixtures.dart';

DirectoryState _ready([CreatorList? list]) {
  final l = list ?? exampleCreatorList();
  return DirectoryState(
    status: DirectoryStatus.ready,
    items: l.items,
    filters: l.filters,
    pagination: l.pagination,
  );
}

Widget _directory(
  DirectoryState state, {
  void Function(FilterKey, String)? onSelect,
  VoidCallback? onShowMore,
  void Function(dynamic)? onOpen,
  VoidCallback? onBrief,
}) => DirectoryView(
  state: state,
  onSelect: onSelect ?? (_, _) {},
  onShowMore: onShowMore ?? () {},
  onRetry: () {},
  onOpen: (card) => onOpen?.call(card),
  onBrief: onBrief ?? () {},
);

void main() {
  group('screen 15 the directory', () {
    testWidgets('MC-US3-S1 shows the cards and the count line', (tester) async {
      await pumpScreen(tester, _directory(_ready()), height: 3200);
      expect(find.text('Creators'), findsOneWidget);
      expect(find.text('Omar K.'), findsOneWidget);
      expect(find.text('Mariam A.'), findsOneWidget);
      expect(
        find.text('12 creators match · featured first, then newest'),
        findsOneWidget,
      );
      expect(find.text('Showing 3 of 12'), findsOneWidget);
    });

    testWidgets(
      'MC-US3-S2 the type chips are the CMS personas and a tap selects one',
      (tester) async {
        FilterKey? key;
        String? slug;
        await pumpScreen(
          tester,
          _directory(
            _ready(),
            onSelect: (k, s) {
              key = k;
              slug = s;
            },
          ),
          height: 3200,
        );
        expect(find.text('Photographers'), findsOneWidget);
        await tester.tap(find.text('Videographers'));
        expect((key, slug), (FilterKey.type, 'videographer'));
      },
    );

    testWidgets('MC-US3-S2 one type only hides the type control', (
      tester,
    ) async {
      final list = exampleCreatorList((j) {
        final filters = j['filters'] as List;
        final type =
            filters.firstWhere((f) => (f as Map)['key'] == 'type') as Map;
        type['options'] = [(type['options'] as List).first];
      });
      await pumpScreen(tester, _directory(_ready(list)), height: 3200);
      expect(find.text('Photographers'), findsNothing);
    });

    testWidgets(
      'MC-US3-S3 emirate and occasion chips show, and "More" opens the full lists',
      (tester) async {
        await pumpScreen(tester, _directory(_ready()), height: 3200);
        expect(find.text('Dubai'), findsOneWidget);
        expect(find.text('Sharjah'), findsNothing);
        await tester.tap(find.text('More'));
        await tester.pump();
        expect(find.text('Sharjah'), findsOneWidget);
        expect(find.text('Events'), findsOneWidget);
      },
    );

    testWidgets('MC-US3-S4 "Show more" asks for the next page', (tester) async {
      var more = 0;
      await pumpScreen(
        tester,
        _directory(_ready(), onShowMore: () => more++),
        height: 3200,
      );
      await tester.tap(find.text('Show more'));
      expect(more, 1);
    });

    testWidgets('MC-US3-S4 no next page means no "Show more"', (tester) async {
      final list = exampleCreatorList(
        (j) => j['pagination'] = {
          'page': 1,
          'pageCount': 1,
          'total': 3,
          'pageSize': 12,
        },
      );
      await pumpScreen(tester, _directory(_ready(list)), height: 3200);
      expect(find.text('Show more'), findsNothing);
      expect(find.text('Showing 3 of 3'), findsOneWidget);
    });

    testWidgets(
      'MC-US3-S5 no match: an empty state, the brief as the primary action and no zero count',
      (tester) async {
        final empty = DirectoryState(
          status: DirectoryStatus.ready,
          filters: exampleCreatorList().filters,
          pagination: const Pagination(
            page: 1,
            pageCount: 0,
            total: 0,
            pageSize: 12,
          ),
        );
        var brief = 0;
        await pumpScreen(tester, _directory(empty, onBrief: () => brief++));
        expect(find.text('No creators match these filters'), findsOneWidget);
        expect(find.textContaining('0 creators'), findsNothing);
        expect(find.byType(TopHit), findsOneWidget);
        await tester.tap(find.text("Tell us the shoot, we'll match you"));
        expect(brief, 1);
      },
    );

    testWidgets(
      'MC-US3-S6 a card is one link announced with the creator name and opens the profile',
      (tester) async {
        final handle = tester.ensureSemantics();
        dynamic opened;
        await pumpScreen(
          tester,
          _directory(_ready(), onOpen: (c) => opened = c),
          height: 3200,
        );
        expect(find.bySemanticsLabel('Omar K., see profile'), findsOneWidget);
        await tester.tap(find.bySemanticsLabel('Omar K., see profile'));
        expect((opened as dynamic).name, 'Omar K.');
        handle.dispose();
      },
    );

    testWidgets('a card shows only what the creator has: no price, no rating', (
      tester,
    ) async {
      await pumpScreen(tester, _directory(_ready()), height: 3200);
      expect(find.textContaining('AED'), findsNothing);
      expect(find.textContaining('from '), findsNothing);
      expect(find.text('Speaks Arabic, English'), findsWidgets);
    });

    testWidgets('a failed first load shows screen 39', (tester) async {
      await pumpScreen(
        tester,
        _directory(const DirectoryState(status: DirectoryStatus.failed)),
      );
      expect(find.text('Try again'), findsOneWidget);
    });
  });

  group('screen 18 work by specialty', () {
    Widget screen(
      SpecialtyView view, {
      void Function(String)? onPlace,
      VoidCallback? onSeeAll,
      VoidCallback? onBrief,
    }) => SpecialtyScreen(
      view: view,
      onPlace: onPlace ?? (_) {},
      onCreator: (_) {},
      onSeeAll: onSeeAll ?? () {},
      onBrief: onBrief ?? () {},
      onBack: () {},
    );

    testWidgets(
      'MC-US4-S1 shows title, line, counts, Top hit, the others and recent work',
      (tester) async {
        await pumpScreen(
          tester,
          screen(SpecialtyView(page: exampleSpecialty())),
          height: 3000,
        );
        expect(find.text('Wedding professionals'), findsOneWidget);
        expect(find.text('24 samples · 12 pros'), findsOneWidget);
        expect(find.text('TOP HIT'), findsOneWidget);
        expect(find.text('Omar K.'), findsOneWidget);
        expect(find.text('EVERYONE ELSE'), findsOneWidget);
        expect(find.text('Mariam A.'), findsOneWidget);
        expect(find.text('RECENT WORK'), findsOneWidget);
        expect(find.textContaining('Garden ceremony'), findsOneWidget);
        expect(find.text('See all 12'), findsOneWidget);
        expect(find.text('Start a Weddings brief'), findsOneWidget);
      },
    );

    testWidgets('MC-US4-S2 zero counts and empty sections are left out', (
      tester,
    ) async {
      final page = exampleSpecialty((j) {
        j['counts'] = {'samples': 0, 'professionals': 0};
        j['creators'] = <dynamic>[];
        j['samples'] = <dynamic>[];
      });
      await pumpScreen(tester, screen(SpecialtyView(page: page)));
      expect(find.textContaining('samples'), findsNothing);
      expect(find.text('TOP HIT'), findsNothing);
      expect(find.text('RECENT WORK'), findsNothing);
      expect(find.byType(TopHit), findsOneWidget);
    });

    testWidgets('MC-US4-S3 an emirate chip narrows the page', (tester) async {
      final page = exampleSpecialty();
      String? chosen;
      await pumpScreen(
        tester,
        screen(SpecialtyView(page: page), onPlace: (p) => chosen = p),
        height: 3000,
      );
      await tester.tap(find.text('Abu Dhabi'));
      expect(chosen, 'Abu Dhabi');
      await pumpScreen(
        tester,
        screen(SpecialtyView(page: page, place: 'Abu Dhabi')),
        height: 3000,
      );
      expect(find.text('Omar K.'), findsNothing);
      expect(find.text('Yusuf R.'), findsOneWidget);
      expect(find.textContaining('1 pro'), findsOneWidget);
    });

    testWidgets('MC-US4-S4 the primary action starts the brief', (
      tester,
    ) async {
      var brief = 0;
      await pumpScreen(
        tester,
        screen(SpecialtyView(page: exampleSpecialty()), onBrief: () => brief++),
        height: 3000,
      );
      await tester.tap(find.text('Start a Weddings brief'));
      expect(brief, 1);
    });

    testWidgets('MC-US4-S5 "See all n" calls back', (tester) async {
      var all = 0;
      await pumpScreen(
        tester,
        screen(SpecialtyView(page: exampleSpecialty()), onSeeAll: () => all++),
        height: 3000,
      );
      await tester.tap(find.text('See all 12'));
      expect(all, 1);
    });
  });

  group('screen 19 hire page', () {
    HireView view(
      HireData data, {
      void Function(int)? onToggle,
      Future<bool> Function(Uri)? open,
      void Function(Map<String, String>)? onSeeAll,
    }) => HireView(
      data: data,
      today: '2026-11-12',
      open: open ?? (_) async => true,
      onToggle: onToggle ?? (_) {},
      onCreator: (_) {},
      onSeeAll: onSeeAll ?? (_) {},
    );

    HireData data({HirePage? page, int? expanded}) => HireData(
      page: page ?? exampleHire(),
      whatsappNumber: testWhatsapp,
      expanded: expanded,
    );

    testWidgets(
      'MC-US5-S1 the brief shows the preset words, changeable, with the hint',
      (tester) async {
        await pumpScreen(tester, view(data()), height: 3000);
        expect(find.text('Wedding photographer in Dubai'), findsOneWidget);
        expect(find.text('a photographer'), findsOneWidget);
        expect(find.text('a wedding'), findsOneWidget);
        expect(find.text('Dubai'), findsWidgets);
        expect(
          find.text(
            'The brief is filled in for this page. Tap a word to change it.',
          ),
          findsOneWidget,
        );
        expect(find.byType(TopHit), findsOneWidget);
        expect(find.text("See who's free"), findsOneWidget);
      },
    );

    testWidgets(
      'MC-US5-S2 a preset that is not an option leaves its word open',
      (tester) async {
        final page = exampleHire(
          (j) => (j['preset'] as Map)['location'] = 'atlantis',
        );
        await pumpScreen(tester, view(data(page: page)), height: 3000);
        expect(find.text('which emirate'), findsOneWidget);
        expect(find.text('a photographer'), findsOneWidget);
      },
    );

    testWidgets(
      'MC-US5-S3 shows the creators with "See all n", and leaves the section out with none',
      (tester) async {
        await pumpScreen(tester, view(data()), height: 3000);
        expect(find.text('12 professionals who can do this'), findsOneWidget);
        expect(find.text('See all 12'), findsOneWidget);
        final none = exampleHire((j) {
          j['creators'] = <dynamic>[];
          j['creatorTotal'] = 0;
        });
        await pumpScreen(tester, view(data(page: none)), height: 3000);
        expect(find.textContaining('professionals who can'), findsNothing);
      },
    );

    testWidgets(
      'MC-US5-S4 a question opens its answer and announces the state',
      (tester) async {
        final handle = tester.ensureSemantics();
        int? toggled;
        await pumpScreen(
          tester,
          view(data(expanded: 0), onToggle: (i) => toggled = i),
          height: 3000,
        );
        expect(find.text('How soon do we get the photos?'), findsOneWidget);
        expect(
          tester
              .getSemantics(
                find.bySemanticsLabel('How soon do we get the photos?'),
              )
              .flagsCollection
              .isExpanded,
          isNotNull,
        );
        await tester.tap(
          find.bySemanticsLabel('Can the photographer speak Arabic?'),
        );
        expect(toggled, 1);
        handle.dispose();
      },
    );

    testWidgets('MC-US5-S5 a complete brief opens WhatsApp with the message', (
      tester,
    ) async {
      Uri? opened;
      await pumpScreen(
        tester,
        view(
          data(),
          open: (uri) async {
            opened = uri;
            return true;
          },
        ),
        height: 3000,
      );
      await tester.tap(find.text("See who's free"));
      await tester.pump();
      expect(opened?.host, 'wa.me');
      expect(
        opened?.queryParameters['text'],
        'Hi! I need a photographer for a wedding in Dubai.',
      );
    });
  });
}
