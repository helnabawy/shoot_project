import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/features/account/domain/entities/account.dart';
import 'package:shoot_mobile/features/account/presentation/pages/account_home_page.dart';

import '../../../helpers/pump_app.dart';

void main() {
  BriefSummary brief({required bool offers}) => BriefSummary(
    reference: 'B-22222',
    sentence: 'A photographer for a birthday',
    sentAt: DateTime.utc(2026, 11, 10),
    status: BriefStatus.newBrief,
    saidYes: 3,
    offers: offers,
  );

  group('OF-US4-S1 offer counts on the client briefs', () {
    testWidgets(
      'an offers brief says how many offers; a fixed brief still says creators said yes',
      (tester) async {
        await tester.pumpApp(
          Material(child: BriefRow(brief: brief(offers: true), onTap: null)),
        );
        await tester.pump(const Duration(seconds: 2));
        expect(find.textContaining('3 offers'), findsOneWidget);
        await tester.pumpApp(
          Material(child: BriefRow(brief: brief(offers: false), onTap: null)),
        );
        await tester.pump(const Duration(seconds: 2));
        expect(find.textContaining('3 offers'), findsNothing);
        expect(find.textContaining('3'), findsWidgets);
      },
    );
  });
}
