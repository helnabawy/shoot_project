import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/widgets/top_hit.dart';
import 'package:shoot_mobile/features/content/domain/entities/path_status.dart';

import '../../../../helpers/content_fixtures.dart';
import '../../../../helpers/content_harness.dart';

void main() {
  late ContentHarness h;

  setUp(() => h = ContentHarness());

  group('MG-US4-S1 a deleted page says so', () {
    testWidgets(
      'MG-US4-S1 the notice, a line, two ways on and one primary action',
      (tester) async {
        h.stubMissingPage('old-studio', PathStatus.removed);
        await pumpContent(tester, h, location: '/old-studio');
        await tester.pumpAndSettle();
        expect(find.text('410'), findsOneWidget);
        expect(find.text('This page has been removed'), findsOneWidget);
        expect(
          find.text(
            'It used to be here, but it is gone. Start from one of these.',
          ),
          findsOneWidget,
        );
        expect(find.text('Read the guides'), findsOneWidget);
        expect(find.text('Ask us on WhatsApp'), findsOneWidget);
        expect(find.byType(TopHit), findsOneWidget);
        expect(find.text('Start a brief'), findsOneWidget);
      },
    );

    testWidgets('MG-US4-S1 the same screen in Arabic', (tester) async {
      h.stubMissingPage('old-studio', PathStatus.removed);
      await pumpContent(
        tester,
        h,
        location: '/old-studio',
        locale: const Locale('ar'),
      );
      await tester.pumpAndSettle();
      expect(find.text('تمت إزالة هذه الصفحة'), findsOneWidget);
    });

    testWidgets('MG-US4-S1 "Ask us on WhatsApp" opens WhatsApp', (
      tester,
    ) async {
      h.stubMissingPage('old-studio', PathStatus.removed);
      await pumpContent(tester, h, location: '/old-studio');
      await tester.pumpAndSettle();
      await tester.tap(find.text('Ask us on WhatsApp'));
      expect(h.whatsappOpened, 1);
    });

    testWidgets('MG-US4-S1 "Start a brief" goes to the landing', (
      tester,
    ) async {
      h.stubMissingPage('old-studio', PathStatus.removed);
      final router = await pumpContent(tester, h, location: '/old-studio');
      await tester.pumpAndSettle();
      await tester.tap(find.text('Start a brief'));
      await tester.pumpAndSettle();
      expect(locationOf(router), '/');
    });
  });

  group('MG-US4-S2 never for an unknown address or a draft', () {
    testWidgets(
      'MG-US4-S2 an address that never existed shows not found (37)',
      (tester) async {
        h.stubMissingPage('never-was', PathStatus.notFound);
        await pumpContent(tester, h, location: '/never-was');
        await tester.pumpAndSettle();
        expect(find.text("That page isn't here"), findsOneWidget);
        expect(find.text('This page has been removed'), findsNothing);
      },
    );
  });

  group('MG-US4-S3 the way on to the guides', () {
    testWidgets('MG-US4-S3 "Read the guides" opens Guides (33)', (
      tester,
    ) async {
      h.stubMissingPage('old-studio', PathStatus.removed);
      h.stubGuides(guideListOf([summaryOf('a', title: 'A guide')]));
      final router = await pumpContent(tester, h, location: '/old-studio');
      await tester.pumpAndSettle();
      await tester.tap(find.text('Read the guides'));
      await tester.pumpAndSettle();
      expect(locationOf(router), '/guides');
      expect(find.text('A guide'), findsOneWidget);
    });
  });
}
