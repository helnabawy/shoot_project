import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/content/pagination.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/creators/data/models/creator_models.dart';
import 'package:shoot_mobile/features/creators/domain/brief/brief_rules.dart';
import 'package:shoot_mobile/features/creators/domain/entities/creators.dart';
import 'package:shoot_mobile/features/creators/domain/repositories/creators_repository.dart';
import 'package:shoot_mobile/features/creators/domain/usecases/creator_use_cases.dart';
import 'package:shoot_mobile/features/creators/domain/usecases/get_brief_context.dart';
import 'package:shoot_mobile/features/creators/presentation/cubit/book_hire_cubits.dart';
import 'package:shoot_mobile/features/creators/presentation/cubit/brief_cubit.dart';
import 'package:shoot_mobile/features/creators/presentation/cubit/directory_cubit.dart';
import 'package:shoot_mobile/features/creators/presentation/cubit/load_state.dart';
import 'package:shoot_mobile/features/creators/presentation/cubit/profile_cubit.dart';
import 'package:shoot_mobile/features/creators/presentation/cubit/specialty_cubit.dart';
import 'package:shoot_mobile/features/site/data/models/brief_builder_model.dart';
import 'package:shoot_mobile/features/site/data/models/site_info_model.dart';
import 'package:shoot_mobile/features/site/domain/repositories/site_repository.dart';

import '../../../../helpers/api_examples.dart';

class _Repo extends Mock implements CreatorsRepository {}

class _Site extends Mock implements SiteRepository {}

CreatorList get _list =>
    CreatorListModel.fromJson(loadExample('creators')).toEntity();
CreatorProfile get _profile =>
    CreatorProfileModel.fromJson(loadExample('creator-profile')).toEntity();
SpecialtyPage get _specialty =>
    SpecialtyPageModel.fromJson(loadExample('specialty')).toEntity();
HirePage get _hire =>
    HirePageModel.fromJson(loadExample('hire-page')).toEntity();

void main() {
  late _Repo repo;
  late _Site site;

  setUpAll(() => registerFallbackValue(const CreatorQuery()));

  setUp(() {
    repo = _Repo();
    site = _Site();
    when(() => site.getSite()).thenAnswer(
      (_) async => Ok(SiteInfoModel.fromJson(loadExample('site')).toEntity()),
    );
  });

  group('ProfileCubit', () {
    ProfileCubit make() => ProfileCubit(
      getProfile: GetCreatorProfile(repo),
      getWhatsappNumber: GetWhatsappNumber(site),
      code: 'sh-0087',
    );

    blocTest<ProfileCubit, LoadState<ProfileData>>(
      'MC-US1-S1 loads the profile with the site WhatsApp number',
      build: make,
      setUp: () =>
          when(() => repo.getProfile('sh-0087'))
              .thenAnswer((_) async => Ok(_profile)),
      act: (c) => c.load(),
      verify: (c) {
        final done = c.state as LoadDone<ProfileData>;
        expect(done.value.profile.name, 'Omar K.');
        expect(done.value.whatsappNumber, isNotNull);
      },
    );

    blocTest<ProfileCubit, LoadState<ProfileData>>(
      'MC-US1-S3 an unlisted creator is not found',
      build: make,
      setUp: () =>
          when(() => repo.getProfile(any()))
              .thenAnswer((_) async => const Err(NotFoundFailure())),
      act: (c) => c.load(),
      expect: () => [
        const LoadInProgress<ProfileData>(),
        const LoadMissing<ProfileData>(),
      ],
    );

    blocTest<ProfileCubit, LoadState<ProfileData>>(
      'a network failure is a failure, and the profile survives a site failure',
      build: make,
      setUp: () {
        when(() => repo.getProfile(any()))
            .thenAnswer((_) async => Ok(_profile));
        when(() => site.getSite())
            .thenAnswer((_) async => const Err(NetworkFailure()));
      },
      act: (c) => c.load(),
      verify: (c) => expect(
        (c.state as LoadDone<ProfileData>).value.whatsappNumber,
        isNull,
      ),
    );
  });

  group('DirectoryCubit', () {
    DirectoryCubit make() => DirectoryCubit(GetCreators(repo));

    test('MC-US3-S1 shows the cards in the API order with the total', () async {
      when(() => repo.getCreators(any())).thenAnswer((_) async => Ok(_list));
      final cubit = make();
      await cubit.load();
      expect(cubit.state.items.first.name, 'Omar K.');
      expect(cubit.state.total, _list.pagination.total);
      expect(cubit.state.shown, _list.items.length);
    });

    test('MC-US3-S2 a chosen type is sent as the type filter and restarts at page 1', () async {
      when(() => repo.getCreators(any())).thenAnswer((_) async => Ok(_list));
      final cubit = make();
      await cubit.load();
      await cubit.select(FilterKey.type, 'photographer');
      final query =
          verify(() => repo.getCreators(captureAny())).captured.last
              as CreatorQuery;
      expect(query.type, 'photographer');
      expect(query.page, 1);
      await cubit.select(FilterKey.type, 'photographer');
      expect(cubit.state.query.type, isNull);
    });

    test('MC-US3-S3 emirate and occasion combine', () async {
      when(() => repo.getCreators(any())).thenAnswer((_) async => Ok(_list));
      final cubit = make();
      await cubit.select(FilterKey.place, 'dubai');
      await cubit.select(FilterKey.specialty, 'weddings');
      expect(cubit.state.query.place, 'dubai');
      expect(cubit.state.query.specialty, 'weddings');
    });

    test('MC-US3-S4 show more appends the next page', () async {
      CreatorList pageOf(int page) => CreatorList(
        locale: 'en',
        items: _list.items,
        filters: _list.filters,
        pagination: Pagination(page: page, pageCount: 2, total: 6, pageSize: 3),
      );
      when(() => repo.getCreators(any())).thenAnswer((inv) async {
        final q = inv.positionalArguments.first as CreatorQuery;
        return Ok(pageOf(q.page ?? 1));
      });
      final cubit = make();
      await cubit.load();
      expect(cubit.state.canMore, isTrue);
      await cubit.showMore();
      expect(cubit.state.shown, _list.items.length * 2);
      expect(cubit.state.pagination!.page, 2);
    });

    test('MC-US3-S5 no match is an empty ready state', () async {
      final empty = CreatorList(
        locale: 'en',
        items: const [],
        filters: _list.filters,
        pagination: const Pagination(
          page: 1,
          pageCount: 0,
          total: 0,
          pageSize: 12,
        ),
      );
      when(() => repo.getCreators(any())).thenAnswer((_) async => Ok(empty));
      final cubit = make();
      await cubit.load();
      expect(cubit.state.isEmpty, isTrue);
    });

    test('a failure is a failed state with its failure', () async {
      when(() => repo.getCreators(any()))
          .thenAnswer((_) async => const Err(NetworkFailure()));
      final cubit = make();
      await cubit.load();
      expect(cubit.state.status, DirectoryStatus.failed);
      expect(cubit.state.failure, const NetworkFailure());
    });
  });

  group('SpecialtyCubit', () {
    SpecialtyCubit make() =>
        SpecialtyCubit(GetSpecialtyPage(repo), slug: 'weddings');

    test(
      'MC-US4-S1 shows the page with Top hit first and the others',
      () async {
        when(() => repo.getSpecialty('weddings'))
            .thenAnswer((_) async => Ok(_specialty));
        final cubit = make();
        await cubit.load();
        final view = (cubit.state as LoadDone<SpecialtyView>).value;
        expect(view.topHit, _specialty.creators.first);
        expect(view.others.length, _specialty.creators.length - 1);
      },
    );

    test(
      'MC-US4-S2 zero counts are zero, which the screen leaves out',
      () async {
        final empty = SpecialtyPage(
          locale: 'en',
          categoryId: _specialty.categoryId,
          slug: 'weddings',
          name: 'Weddings',
          title: '',
          description: '',
          intro: '',
          sampleCount: 0,
          professionalCount: 0,
          creators: const [],
          samples: const [],
        );
        when(() => repo.getSpecialty(any())).thenAnswer((_) async => Ok(empty));
        final cubit = make();
        await cubit.load();
        final view = (cubit.state as LoadDone<SpecialtyView>).value;
        expect(view.sampleCount, 0);
        expect(view.topHit, isNull);
      },
    );

    test('MC-US4-S3 an emirate narrows creators, samples and counts', () async {
      when(() => repo.getSpecialty(any()))
          .thenAnswer((_) async => Ok(_specialty));
      final cubit = make();
      await cubit.load();
      final all = (cubit.state as LoadDone<SpecialtyView>).value;
      final place = all.places.last;
      cubit.selectPlace(place);
      final narrowed = (cubit.state as LoadDone<SpecialtyView>).value;
      expect(narrowed.creators.every((c) => c.places.contains(place)), isTrue);
      expect(narrowed.professionalCount, narrowed.creators.length);
      cubit.selectPlace(place);
      expect((cubit.state as LoadDone<SpecialtyView>).value.place, isNull);
    });

    test('MC-US4-S6 an unknown specialty is not found', () async {
      when(() => repo.getSpecialty(any()))
          .thenAnswer((_) async => const Err(NotFoundFailure()));
      final cubit = make();
      await cubit.load();
      expect(cubit.state, isA<LoadMissing<SpecialtyView>>());
    });
  });

  group('HireCubit', () {
    HireCubit make() => HireCubit(
      getHirePage: GetHirePage(repo),
      getWhatsappNumber: GetWhatsappNumber(site),
      slug: 'wedding-photographer-dubai',
    );

    test(
      'MC-US5-S4 a question opens, another replaces it, the same closes it',
      () async {
        when(() => repo.getHirePage(any())).thenAnswer((_) async => Ok(_hire));
        final cubit = make();
        await cubit.load();
        int? open() => (cubit.state as LoadDone<HireData>).value.expanded;
        cubit.toggle(0);
        expect(open(), 0);
        cubit.toggle(1);
        expect(open(), 1);
        cubit.toggle(1);
        expect(open(), isNull);
      },
    );

    test('MC-US5-S6 an unknown page is not found', () async {
      when(() => repo.getHirePage(any()))
          .thenAnswer((_) async => const Err(NotFoundFailure()));
      final cubit = make();
      await cubit.load();
      expect(cubit.state, isA<LoadMissing<HireData>>());
    });
  });

  group('BookCubit', () {
    test('MC-US2-S1 loads the creator and the brief builder', () async {
      when(() => repo.getProfile(any())).thenAnswer((_) async => Ok(_profile));
      when(() => site.getBriefBuilder()).thenAnswer(
        (_) async => Ok(
          BriefBuilderModel.fromJson(loadExample('brief-builder')).toEntity(),
        ),
      );
      final cubit = BookCubit(
        getProfile: GetCreatorProfile(repo),
        getContext: GetBriefContext(site),
        code: 'SH-0087',
      );
      await cubit.load();
      final data = (cubit.state as LoadDone<BookData>).value;
      expect(data.profile.displayCode, 'SH-0087');
      expect(data.context.builder, isNotNull);
    });

    test(
      'a missing creator is not found even when the builder loads',
      () async {
        when(() => repo.getProfile(any()))
            .thenAnswer((_) async => const Err(NotFoundFailure()));
        when(() => site.getBriefBuilder()).thenAnswer(
          (_) async => Ok(
            BriefBuilderModel.fromJson(loadExample('brief-builder')).toEntity(),
          ),
        );
        final cubit = BookCubit(
          getProfile: GetCreatorProfile(repo),
          getContext: GetBriefContext(site),
          code: 'x',
        );
        await cubit.load();
        expect(cubit.state, isA<LoadMissing<BookData>>());
      },
    );
  });

  group('BriefCubit', () {
    final config = BriefBuilderModel.fromJson(loadExample('brief-builder'))
        .toEntity()
        .builder!;
    BriefCreator omar() => BriefCreator.fromProfile(_profile);

    BriefCubit make({
      Map<String, String> initial = const {},
      BriefDraft? draft,
    }) => BriefCubit(
      rules: BriefRules(config, creator: omar()),
      today: '2026-11-12',
      initial: initial,
      draft: draft,
    );

    test('MC-US2-S4 a complete brief gives the message naming the creator', () {
      final cubit = make(
        initial: {'persona': 'photographer', 'occasion': 'wedding'},
      );
      expect(cubit.state.isComplete, isFalse);
      cubit.choose(config.slots[2], 'dubai');
      expect(cubit.state.isComplete, isTrue);
      expect(
        cubit.message(creatorLine: 'Creator: Omar K. (SH-0087)'),
        'Hi! I need a photographer for a wedding in Dubai.\nCreator: Omar K. (SH-0087)',
      );
    });

    test('MC-US2-S5 answers are kept in the draft for the next creator', () {
      final draft = BriefDraft();
      make(draft: draft).choose(config.slots[1], 'wedding');
      expect(draft.values, {'occasion': 'wedding'});
      final next = make(initial: draft.values);
      expect(next.state.values['occasion'], 'wedding');
    });

    test(
      'MC-US5-S2 a preset that is not an option is left open, the rest kept',
      () {
        final cubit = BriefCubit(
          rules: BriefRules(config),
          today: '2026-11-12',
          initial: {
            'persona': 'teacher',
            'occasion': 'wedding',
            'location': 'dubai',
          },
        );
        expect(cubit.state.values.containsKey('persona'), isFalse);
        expect(cubit.state.nextSlot?.token, 'persona');
        expect(cubit.state.values['location'], 'dubai');
      },
    );

    test('tapping a word reopens its choices', () {
      final cubit = make(
        initial: {'persona': 'photographer', 'occasion': 'wedding'},
      );
      cubit.reopen(config.slots[1]);
      expect(cubit.state.activeSlot?.token, 'occasion');
    });

    test('changing the type drops an occasion that no longer applies', () {
      final cubit = BriefCubit(
        rules: BriefRules(config),
        today: '2026-11-12',
        initial: {'persona': 'photographer', 'occasion': 'portrait'},
      );
      cubit.choose(config.slots[0], 'videographer');
      expect(cubit.state.values.containsKey('occasion'), isFalse);
    });
  });
}
