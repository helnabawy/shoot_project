import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/creator_account/domain/entities/creator_account.dart';
import 'package:shoot_mobile/features/creator_account/domain/repositories/creator_account_repository.dart';
import 'package:shoot_mobile/features/creator_account/presentation/cubit/profile_cubit.dart';

import '../fixtures.dart';

void main() {
  late MockCreatorAccountRepository repo;
  late FakeFilePicker picker;
  late MyProfile draft;
  late MyProfile ready;

  setUpAll(() {
    registerFallbackValue(pickedFile());
    registerFallbackValue(IdentityKind.emiratesId);
    registerFallbackValue(const LocalText());
  });

  setUp(() {
    repo = MockCreatorAccountRepository();
    picker = FakeFilePicker();
    draft = profileExample('creator-profile-draft');
    ready = profileExample('creator-profile-ready');
    when(() => repo.profile()).thenAnswer((_) async => Ok(draft));
  });

  ProfileCubit make() => ProfileCubit(repository: repo, picker: picker);

  Future<ProfileCubit> loaded() async {
    final c = make();
    await c.load();
    return c;
  }

  ProfileReady at(ProfileCubit c) => c.state as ProfileReady;

  test('MW-US1-S1 opens on the first step that needs attention', () async {
    final c = await loaded();
    final s = at(c);
    expect(s.step, StepKey.about);
    expect(s.profile.needing, hasLength(3));
    expect(s.ready, isFalse);
    expect(s.inReview, isFalse);
  });

  test('a failed first read is a failure state', () async {
    when(() => repo.profile())
        .thenAnswer((_) async => const Err(NetworkFailure()));
    final c = make();
    await c.load();
    expect(c.state, isA<ProfileFailed>());
  });

  test('MW-US1-S4 leaving a step saves it and takes the new state', () async {
    when(() => repo.saveProfile(any())).thenAnswer((_) async => Ok(ready));
    final c = await loaded();
    c.edit(StepKey.about, at(c).fields.copyWith(gender: Gender.man));
    await c.next();
    verify(
      () => repo.saveProfile({
        'gender': 'man',
        'nationality': null,
        'yearsExperience': null,
      }),
    ).called(1);
    final s = at(c);
    expect(s.step, StepKey.places);
    expect(s.dirty, isEmpty);
    expect(s.profile.strength, 100);
  });

  test('MW-US1-S4 nothing edited, nothing sent', () async {
    final c = await loaded();
    await c.goTo(StepKey.links);
    verifyNever(() => repo.saveProfile(any()));
    expect(at(c).step, StepKey.links);
    await c.back();
    expect(at(c).step, StepKey.places);
  });

  test(
    'MW-US1-S9 a refused save opens the first error step and keeps the edit',
    () async {
      when(() => repo.saveProfile(any())).thenAnswer(
        (_) async => const Err(
          ServerFailure(
            statusCode: 422,
            code: 'api.errors.invalidInput',
            fields: [
              (path: 'body.languages', code: 'creators.errors.required'),
            ],
          ),
        ),
      );
      final c = await loaded();
      c.edit(
        StepKey.basics,
        at(c).fields.copyWith(bio: const LocalText(en: 'Hi')),
      );
      await c.goTo(StepKey.links);
      final s = at(c);
      expect(s.step, StepKey.places);
      expect(s.errors['languages'], 'creators.errors.required');
      expect(s.fields.bio.en, 'Hi');
      expect(s.dirty, {StepKey.basics});
    },
  );

  test('MW-US1-S5 send stays off while anything required is missing', () async {
    final c = await loaded();
    await c.submit();
    verifyNever(() => repo.submit());
  });

  test('MW-US1-S6 and S7 a complete draft shows the list; sending shows the '
      'review', () async {
    when(() => repo.profile()).thenAnswer((_) async => Ok(ready));
    when(() => repo.submit())
        .thenAnswer((_) async => Ok(profileExample('creator-profile-review')));
    final c = await loaded();
    expect(at(c).ready, isTrue);
    await c.submit();
    expect(at(c).inReview, isTrue);
    expect(at(c).profile.status, ProfileStatus.inReview);
  });

  test('MW-US3-S1 "Finish my profile" opens the first missing step', () async {
    final c = await loaded();
    c.openFirstNeeding();
    expect(at(c).strip, isTrue);
    expect(at(c).step, StepKey.about);
  });

  test('MW-US5-S1 editing a sent profile opens the strip', () async {
    when(() => repo.profile())
        .thenAnswer((_) async => Ok(profileExample('creator-profile-review')));
    final c = await loaded();
    expect(at(c).inReview, isTrue);
    c.startEditing();
    expect(at(c).inReview, isFalse);
  });

  test('MW-US5-S5 hiding the profile', () async {
    when(() => repo.setHidden(hidden: true)).thenAnswer((_) async => Ok(draft));
    final c = await loaded();
    await c.setHidden(hidden: true);
    verify(() => repo.setHidden(hidden: true)).called(1);
    expect(at(c).busy, isFalse);
  });

  group('MW-US1-S8 identity documents', () {
    test('a PDF within the limit is uploaded', () async {
      picker.file = pickedFile(type: 'application/pdf', name: 'id.pdf');
      when(() => repo.uploadIdentity(any(), any()))
          .thenAnswer((_) async => Ok(ready));
      final c = await loaded();
      await c.pickIdentity(IdentityKind.emiratesId, PickSource.files);
      verify(() => repo.uploadIdentity(IdentityKind.emiratesId, any()))
          .called(1);
      expect(
        at(c).profile.identity[IdentityKind.emiratesId]!.state,
        IdentityState.pending,
      );
    });

    test('a larger file or another format is refused with a line', () async {
      final c = await loaded();
      picker.file = pickedFile(size: draft.identityBytes + 1);
      await c.pickIdentity(IdentityKind.tradeLicense, PickSource.files);
      expect(at(c).notice, ProfileNotice.fileTooLarge);
      picker.file = pickedFile(type: 'text/plain');
      await c.pickIdentity(IdentityKind.tradeLicense, PickSource.files);
      expect(at(c).notice, ProfileNotice.fileWrongType);
      verifyNever(() => repo.uploadIdentity(any(), any()));
    });

    test('refused camera access says so', () async {
      picker.denied = true;
      final c = await loaded();
      await c.pickIdentity(IdentityKind.emiratesId, PickSource.camera);
      expect(at(c).notice, ProfileNotice.accessDenied);
    });

    test('cancelling the picker changes nothing', () async {
      final c = await loaded();
      await c.pickIdentity(IdentityKind.emiratesId, PickSource.files);
      verifyNever(() => repo.uploadIdentity(any(), any()));
    });
  });

  group('photo and samples', () {
    test('a photo uploads and replaces the state', () async {
      picker.file = pickedFile();
      when(() => repo.uploadPhoto(any())).thenAnswer((_) async => Ok(ready));
      final c = await loaded();
      await c.pickPhoto(PickSource.library);
      expect(at(c).profile.photo, isNotNull);
    });

    test('a wrong format photo is refused', () async {
      picker.file = pickedFile(type: 'application/pdf');
      final c = await loaded();
      await c.pickPhoto(PickSource.library);
      expect(at(c).notice, ProfileNotice.fileWrongType);
    });

    test('adding a sample at the limit is refused with a line', () async {
      final full = MyProfile(
        code: ready.code,
        status: ready.status,
        submittedAt: null,
        reviewNote: '',
        strength: 100,
        canSubmit: true,
        hasPendingChanges: false,
        fields: ready.fields,
        photo: null,
        samples: ready.samples,
        identity: ready.identity,
        steps: ready.steps,
        options: ready.options,
        sampleLimit: 1,
        identityBytes: 100,
      );
      when(() => repo.profile()).thenAnswer((_) async => Ok(full));
      final c = await loaded();
      await c.addSample(PickSource.library);
      expect(at(c).notice, ProfileNotice.sampleLimit);
    });

    test('adding and removing a sample', () async {
      picker.file = pickedFile();
      when(
        () => repo.addSample(
          file: any(named: 'file'),
          caption: any(named: 'caption'),
          specialty: any(named: 'specialty'),
        ),
      ).thenAnswer((_) async => Ok(ready));
      when(() => repo.removeSample(0)).thenAnswer((_) async => Ok(draft));
      final c = await loaded();
      await c.addSample(PickSource.library, specialty: '10');
      expect(at(c).profile.samples, hasLength(1));
      await c.removeSample(0);
      expect(at(c).profile.samples, isEmpty);
    });

    test('a failed upload keeps the profile and shows the failure', () async {
      picker.file = pickedFile();
      when(() => repo.uploadPhoto(any()))
          .thenAnswer((_) async => const Err(NetworkFailure()));
      final c = await loaded();
      await c.pickPhoto(PickSource.camera);
      expect(at(c).failure, const NetworkFailure());
      expect(at(c).busy, isFalse);
    });
  });

  blocTest<ProfileCubit, ProfileState>(
    'leaving the screen saves what is edited',
    build: () {
      when(() => repo.saveProfile(any())).thenAnswer((_) async => Ok(ready));
      return make();
    },
    act: (c) async {
      await c.load();
      c.edit(StepKey.about, at(c).fields.copyWith(gender: Gender.woman));
      await c.leave();
    },
    verify: (_) => verify(() => repo.saveProfile(any())).called(1),
  );
}
