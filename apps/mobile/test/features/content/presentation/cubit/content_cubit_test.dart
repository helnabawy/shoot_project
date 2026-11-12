import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/content/domain/entities/guides.dart';
import 'package:shoot_mobile/features/content/domain/entities/legal.dart';
import 'package:shoot_mobile/features/content/domain/entities/path_status.dart';
import 'package:shoot_mobile/features/content/domain/usecases/check_path.dart';
import 'package:shoot_mobile/features/content/presentation/cubit/content_state.dart';

import '../../../../helpers/content_fixtures.dart';
import '../../../../helpers/content_harness.dart';

Matcher _missing({required bool removed}) =>
    isA<ContentMissing<dynamic>>().having((s) => s.removed, 'removed', removed);

void main() {
  late ContentHarness h;

  setUp(() => h = ContentHarness());

  group('MG-US4-S2 a 404 is removed only when resolve says so', () {
    test(
      'MG-US4-S2 removed path gives ContentMissing(removed: true)',
      () async {
        h.stubMissingPage('old', PathStatus.removed);
        expect(await h.deps.loaders.page('old')(), _missing(removed: true));
      },
    );

    test('MG-US4-S2 an unknown path or a draft gives removed: false', () async {
      h.stubMissingPage('never', PathStatus.notFound);
      expect(await h.deps.loaders.page('never')(), _missing(removed: false));
    });

    test('MG-US4-S2 a failing resolve check falls back to not found', () async {
      when(() => h.repository.getPage('x'))
          .thenAnswer((_) async => const Err(NotFoundFailure()));
      when(() => h.status.getStatus('/x'))
          .thenAnswer((_) async => const Err(NetworkFailure()));
      expect(await h.deps.loaders.page('x')(), _missing(removed: false));
    });

    test('MG-US4-S2 a successful read never asks resolve', () async {
      h.stubPage('about', examplePage());
      await h.deps.loaders.page('about')();
      verifyNever(() => h.status.getStatus(any()));
    });
  });

  group('MG-US2-S3 a guide that is not live is not removed', () {
    test(
      'MG-US2-S3 a scheduled guide (404, no removed record) is missing',
      () async {
        h.stubMissingGuide('later', PathStatus.notFound);
        expect(
          await h.deps.loaders.article('later')(),
          _missing(removed: false),
        );
      },
    );

    test('MG-US2-S3 a deleted guide is removed', () async {
      h.stubMissingGuide('gone', PathStatus.removed);
      expect(await h.deps.loaders.article('gone')(), _missing(removed: true));
    });
  });

  group('MG-US1-S4 legal reads', () {
    test('MG-US1-S4 the version in force carries the upcoming one', () async {
      h.stubLegal(LegalKind.terms, exampleLegal());
      final state = await h.deps.loaders.legal(LegalKind.terms)();
      expect(state, isA<ContentLoaded<LegalDocument>>());
      expect(
        (state as ContentLoaded<LegalDocument>).value.upcoming?.version,
        3,
      );
    });

    test('MG-US1-S5 a version is read by number', () async {
      h.stubLegalVersion(LegalKind.privacy, 1, exampleLegalVersion());
      final state = await h.deps.loaders.legal(LegalKind.privacy, version: 1)();
      expect((state as ContentLoaded<LegalDocument>).value.version, 1);
    });

    test('MG-US1-S5 no document is missing, never removed', () async {
      when(() => h.repository.getLegalVersions(LegalKind.terms))
          .thenAnswer((_) async => const Err(NotFoundFailure()));
      expect(
        await h.deps.loaders.legalVersions(LegalKind.terms)(),
        _missing(removed: false),
      );
      verifyNever(() => h.status.getStatus(any()));
    });
  });

  group('MG-US3-S6 every open reads again', () {
    blocTest<ContentCubit<GuideList>, ContentState<GuideList>>(
      'MG-US3-S6 load then reload reads twice and shows loading in between',
      build: ContentCubit<GuideList>.new,
      act: (cubit) async {
        var reads = 0;
        await cubit.load(() async {
          reads++;
          return ContentLoaded(guideListOf([summaryOf('a$reads')]));
        });
        await cubit.reload();
      },
      expect: () => [
        const ContentLoading<GuideList>(),
        ContentLoaded(guideListOf([summaryOf('a1')])),
        const ContentLoading<GuideList>(),
        ContentLoaded(guideListOf([summaryOf('a2')])),
      ],
    );

    test('MG-US3-S6 a failure keeps its failure for "Try again"', () async {
      final cubit = ContentCubit<int>();
      var fail = true;
      await cubit.load(
        () async => fail
            ? const ContentFailed(NetworkFailure())
            : const ContentLoaded(1),
      );
      expect(cubit.state, const ContentFailed<int>(NetworkFailure()));
      fail = false;
      await cubit.reload();
      expect(cubit.state, const ContentLoaded<int>(1));
      await cubit.close();
    });

    test('MG-US3-S6 an older read that finishes late does not win', () async {
      final cubit = ContentCubit<int>();
      // The first read is slow; the second (a new address) finishes first.
      final slow = cubit.load(() async {
        await Future<void>.delayed(const Duration(milliseconds: 20));
        return const ContentLoaded(1);
      });
      await cubit.load(() async => const ContentLoaded(2));
      await slow;
      expect(cubit.state, const ContentLoaded<int>(2));
      await cubit.close();
    });
  });

  test('MG-US4-S2 IsRemovedPath is what the loaders use', () {
    expect(h.deps.loaders.isRemoved, isA<IsRemovedPath>());
  });
}
