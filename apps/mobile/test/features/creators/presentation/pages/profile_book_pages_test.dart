import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/widgets/top_hit.dart';
import 'package:shoot_mobile/features/creators/domain/usecases/get_brief_context.dart';
import 'package:shoot_mobile/features/creators/presentation/cubit/book_hire_cubits.dart';
import 'package:shoot_mobile/features/creators/presentation/cubit/brief_cubit.dart';
import 'package:shoot_mobile/features/creators/presentation/cubit/profile_cubit.dart';
import 'package:shoot_mobile/features/creators/presentation/pages/book_page.dart';
import 'package:shoot_mobile/features/creators/presentation/pages/profile_page.dart';
import 'package:shoot_mobile/features/creators/presentation/pages/sample_viewer.dart';
import 'package:shoot_mobile/features/site/data/models/brief_builder_model.dart';

import '../../../../helpers/api_examples.dart';
import '../../../../helpers/creators_fixtures.dart';

ProfileView _profileView(
  ProfileData data, {
  void Function(String)? onLink,
  void Function(List<dynamic>, int)? onSample,
  VoidCallback? onBook,
  VoidCallback? onShare,
  VoidCallback? onWhatsapp,
}) => ProfileView(
  data: data,
  onBack: () {},
  onBook: onBook ?? () {},
  onShare: onShare ?? () {},
  onWhatsapp: onWhatsapp ?? () {},
  onLink: onLink ?? (_) {},
  onSample: (samples, i) => onSample?.call(samples, i),
);

void main() {
  group('screen 16 the profile', () {
    testWidgets(
      'MC-US1-S1 shows the name, code, facts and the primary action',
      (tester) async {
        await pumpScreen(tester, _profileView(exampleProfileData()));
        expect(find.text('Omar K.'), findsOneWidget);
        expect(find.text('SH-0087'), findsOneWidget);
        expect(find.text('Photographer and videographer'), findsOneWidget);
        expect(find.text('Weddings · Events · Portraits'), findsOneWidget);
        expect(find.text('Sharjah · Dubai'), findsOneWidget);
        expect(find.text('Book with Omar'), findsOneWidget);
        expect(find.byType(TopHit), findsOneWidget);
        expect(find.text('Arabic · English'), findsOneWidget);
        expect(find.text('6 years'), findsOneWidget);
      },
    );

    testWidgets(
      'MC-US1-S1 a creator with no photo shows the scene tile named "No photo yet"',
      (tester) async {
        final handle = tester.ensureSemantics();
        await pumpScreen(
          tester,
          _profileView(exampleProfileData((j) => j['photo'] = null)),
        );
        expect(find.bySemanticsLabel('No photo yet'), findsOneWidget);
        handle.dispose();
      },
    );

    testWidgets('MC-US1-S2 no verified mark and no ratings are drawn', (
      tester,
    ) async {
      await pumpScreen(tester, _profileView(exampleProfileData()));
      expect(find.textContaining('Verified'), findsNothing);
      expect(find.textContaining('rating'), findsNothing);
      expect(find.textContaining('review'), findsNothing);
    });

    testWidgets(
      'MC-US1-S5 "Ask on WhatsApp" is offered with the site number and calls back',
      (tester) async {
        var asked = 0;
        await pumpScreen(
          tester,
          _profileView(exampleProfileData(), onWhatsapp: () => asked++),
        );
        await tester.tap(find.text('Ask on WhatsApp'));
        expect(asked, 1);
      },
    );

    testWidgets(
      'MC-US1-S5 without a site WhatsApp number the row is not offered',
      (tester) async {
        await pumpScreen(tester, _profileView(exampleProfileData(null, null)));
        expect(find.text('Ask on WhatsApp'), findsNothing);
      },
    );

    testWidgets('MC-US1-S6 the share button calls back', (tester) async {
      final handle = tester.ensureSemantics();
      var shared = 0;
      await pumpScreen(
        tester,
        _profileView(exampleProfileData(), onShare: () => shared++),
      );
      await tester.tap(find.bySemanticsLabel('Share profile'));
      expect(shared, 1);
      handle.dispose();
    });

    testWidgets(
      'MC-US1-S7 no samples shows the awaiting state and no "See the work"',
      (tester) async {
        await pumpScreen(
          tester,
          _profileView(exampleProfileData((j) => j['samples'] = <dynamic>[])),
        );
        expect(find.text('Samples are on their way.'), findsOneWidget);
        expect(find.text('See the work'), findsNothing);
      },
    );

    testWidgets(
      'MC-US1-S4 samples are named by position and kind, and open on tap',
      (tester) async {
        final handle = tester.ensureSemantics();
        int? opened;
        await pumpScreen(
          tester,
          _profileView(exampleProfileData(), onSample: (_, i) => opened = i),
        );
        expect(find.bySemanticsLabel(RegExp('^Sample 1 of 3')), findsOneWidget);
        expect(
          find.bySemanticsLabel(RegExp('^Sample 3 of 3, video')),
          findsOneWidget,
        );
        await tester.tap(find.bySemanticsLabel(RegExp('^Sample 2 of 3')));
        expect(opened, 1);
        handle.dispose();
      },
    );

    testWidgets(
      'MC-US1-S4 the viewer shows the caption and swipes to the next sample',
      (tester) async {
        final profile = exampleProfile();
        Uri? played;
        await pumpScreen(
          tester,
          Builder(
            builder: (context) => TextButton(
              onPressed: () => Navigator.of(context).push<void>(
                MaterialPageRoute(
                  builder: (_) => SampleViewer(
                    samples: profile.samples,
                    initial: 0,
                    onPlay: (url) => played = url,
                  ),
                ),
              ),
              child: const Text('open'),
            ),
          ),
        );
        await tester.tap(find.text('open'));
        await tester.pumpAndSettle();
        expect(find.text('Garden ceremony'), findsOneWidget);
        expect(find.text('1 / 3'), findsOneWidget);
        await tester.fling(find.byType(PageView), const Offset(-300, 0), 1000);
        await tester.pumpAndSettle();
        expect(find.text('First dance'), findsOneWidget);
        await tester.fling(find.byType(PageView), const Offset(-300, 0), 1000);
        await tester.pumpAndSettle();
        await tester.tap(find.text('Play video'));
        expect(played.toString(), contains('youtube.com'));
      },
    );

    testWidgets('MC-US1-S8 in Arabic the screen is right to left', (
      tester,
    ) async {
      await pumpScreen(
        tester,
        _profileView(exampleProfileData()),
        locale: const Locale('ar'),
      );
      final context = tester.element(find.byType(ProfileView));
      expect(Directionality.of(context), TextDirection.rtl);
      expect(find.text('احجز مع Omar'), findsOneWidget);
    });
  });

  group('screen 17 book this creator', () {
    BookData book({Patch? patch}) => BookData(
      profile: exampleProfile(patch),
      context: BriefContext(
        builder: BriefBuilderModel.fromJson(loadExample('brief-builder'))
            .toEntity()
            .builder,
        whatsappNumber: testWhatsapp,
      ),
    );

    Widget view(
      BookData data, {
      BriefDraft? draft,
      Future<bool> Function(Uri)? open,
      VoidCallback? onChange,
    }) => BookView(
      data: data,
      draft: draft ?? BriefDraft(),
      today: '2026-11-12',
      open: open ?? (_) async => true,
      onBack: () {},
      onChange: onChange ?? () {},
    );

    testWidgets(
      'MC-US2-S1 shows the creator card and only the emirates they work in',
      (tester) async {
        await pumpScreen(
          tester,
          view(
            book(),
            draft: BriefDraft()
              ..values = {'persona': 'photographer', 'occasion': 'wedding'},
          ),
        );
        expect(find.text('Book Omar K.'), findsOneWidget);
        expect(
          find.text('Photographer and videographer · Code SH-0087'),
          findsOneWidget,
        );
        expect(find.text('WHERE OMAR WORKS'), findsOneWidget);
        expect(find.text('Dubai'), findsOneWidget);
        expect(find.text('Sharjah'), findsOneWidget);
        expect(find.text('Abu Dhabi'), findsNothing);
      },
    );

    testWidgets(
      'MC-US2-S2 one offered type is already in the sentence and the occasion is asked',
      (tester) async {
        await pumpScreen(
          tester,
          view(book(patch: (j) => j['personaSlugs'] = ['photographer'])),
        );
        expect(find.text('a photographer'), findsOneWidget);
        expect(find.text('Weddings'), findsOneWidget);
      },
    );

    testWidgets('MC-US2-S5 "Change" calls back', (tester) async {
      var changed = 0;
      await pumpScreen(tester, view(book(), onChange: () => changed++));
      await tester.tap(find.text('Change'));
      expect(changed, 1);
    });

    testWidgets('MC-US2-S6 the no-account hint is shown', (tester) async {
      await pumpScreen(tester, view(book()));
      expect(
        find.text(
          'No account needed to send a brief. We ask for your number at the last step.',
        ),
        findsOneWidget,
      );
    });

    testWidgets(
      'MC-US2-S4 a complete brief opens WhatsApp with the message naming the creator and clears the draft',
      (tester) async {
        Uri? opened;
        final draft = BriefDraft()
          ..values = {'persona': 'photographer', 'occasion': 'wedding'};
        await pumpScreen(
          tester,
          view(
            book(),
            draft: draft,
            open: (uri) async {
              opened = uri;
              return true;
            },
          ),
        );
        await tester.tap(find.text('Dubai'));
        await tester.pump();
        await tester.tap(find.text('Book with Omar'));
        await tester.pump();
        expect(opened?.host, 'wa.me');
        expect(opened?.path, '/971501234567');
        final text = opened!.queryParameters['text']!;
        expect(text, contains('I need a photographer for a wedding in Dubai'));
        expect(text, contains('Omar K. (SH-0087)'));
        expect(draft.values, isEmpty);
      },
    );

    testWidgets('a switched-off brief builder offers WhatsApp instead', (
      tester,
    ) async {
      await pumpScreen(
        tester,
        view(
          BookData(
            profile: exampleProfile(),
            context: const BriefContext(
              builder: null,
              whatsappNumber: testWhatsapp,
            ),
          ),
        ),
      );
      expect(find.text('Ask on WhatsApp'), findsOneWidget);
    });
  });
}
