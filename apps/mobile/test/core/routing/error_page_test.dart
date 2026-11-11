import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/routing/error_page.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';

import '../../helpers/pump_app.dart';

void main() {
  testWidgets(
    'MF-US5-S3 a failure shows screen 39 with Try again and no technical text',
    (tester) async {
      var attempts = 0;
      final restore = installErrorPage();
      final router = GoRouter(
        routes: [
          GoRoute(
            path: '/',
            builder: (context, state) {
              attempts++;
              if (attempts == 1) {
                throw StateError('database password is hunter2');
              }
              return const Text('recovered');
            },
          ),
        ],
      );
      addTearDown(router.dispose);
      await tester.pumpWidget(
        MaterialApp.router(
          routerConfig: router,
          theme: AppTheme.light,
          supportedLocales: AppLocalizations.supportedLocales,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
        ),
      );
      expect(tester.takeException(), isA<StateError>());
      await tester.pumpAndSettle();

      expect(find.byType(ErrorPage), findsOneWidget);
      expect(find.text('Something went wrong'), findsOneWidget);
      expect(find.textContaining('hunter2'), findsNothing);
      expect(find.textContaining('StateError'), findsNothing);

      await tester.tap(find.text('Try again'));
      await tester.pumpAndSettle();
      expect(find.text('recovered'), findsOneWidget);
      // The binding checks ErrorWidget.builder before teardowns run.
      restore();
    },
  );

  testWidgets('MF-US5-S3 the WhatsApp row shows only with a site number', (
    tester,
  ) async {
    await tester.pumpApp(ErrorPage(onRetry: () {}));
    expect(find.text('Ask us on WhatsApp'), findsNothing);
    expect(find.text('Back to the start'), findsOneWidget);

    await tester.pumpApp(
      ErrorPage(onRetry: () {}, whatsappNumber: '+971500000000'),
    );
    expect(find.text('Ask us on WhatsApp'), findsOneWidget);
  });

  testWidgets('MF-US5-S3 Try again calls the retry', (tester) async {
    var retried = 0;
    await tester.pumpApp(ErrorPage(onRetry: () => retried++));
    await tester.tap(find.text('Try again'));
    expect(retried, 1);
  });
}
