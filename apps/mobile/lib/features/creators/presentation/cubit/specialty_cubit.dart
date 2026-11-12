import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shoot_mobile/core/content/creator_card.dart';
import 'package:shoot_mobile/features/creators/domain/entities/creators.dart';
import 'package:shoot_mobile/features/creators/domain/usecases/creator_use_cases.dart';
import 'package:shoot_mobile/features/creators/presentation/cubit/load_state.dart';

/// A specialty page narrowed to one emirate (MC-US4-S3). The answer carries every listed
/// creator and the recent samples, so the narrowing happens here (research R8); counts show only
/// when they are not zero (FR-003).
final class SpecialtyView extends Equatable {
  const SpecialtyView({required this.page, this.place});

  final SpecialtyPage page;

  /// The chosen emirate's name, or `null` for all.
  final String? place;

  /// The emirates the listed creators work in, in the order first met.
  List<String> get places => [
    for (final p in {for (final c in page.creators) ...c.places}) p,
  ];

  List<CreatorCard> get creators => place == null
      ? page.creators
      : [
          for (final c in page.creators)
            if (c.places.contains(place)) c,
        ];

  List<SpecialtySample> get samples {
    if (place == null) return page.samples;
    final codes = {for (final c in creators) c.code};
    return [
      for (final s in page.samples)
        if (codes.contains(s.creatorCode)) s,
    ];
  }

  int get sampleCount => place == null ? page.sampleCount : samples.length;

  int get professionalCount =>
      place == null ? page.professionalCount : creators.length;

  /// The first creator in the directory's order: a result, not a recommendation.
  CreatorCard? get topHit => creators.isEmpty ? null : creators.first;

  List<CreatorCard> get others =>
      creators.length < 2 ? const [] : creators.sublist(1);

  @override
  List<Object?> get props => [page, place];
}

/// Screen 18 (MC-US4).
class SpecialtyCubit extends Cubit<LoadState<SpecialtyView>> {
  SpecialtyCubit(this._getSpecialty, {required this.slug})
    : super(const LoadInProgress());

  final GetSpecialtyPage _getSpecialty;
  final String slug;

  Future<void> load() async {
    emit(const LoadInProgress());
    final result = await _getSpecialty(slug);
    emit(switch (LoadState.of(result)) {
      LoadDone(:final value) => LoadDone(SpecialtyView(page: value)),
      LoadFailed(:final failure) => LoadFailed(failure),
      _ => const LoadMissing(),
    });
  }

  /// Chooses an emirate by name; the chosen one again clears it.
  void selectPlace(String place) {
    final current = state;
    if (current is! LoadDone<SpecialtyView>) return;
    final view = current.value;
    emit(
      LoadDone(
        SpecialtyView(
          page: view.page,
          place: view.place == place ? null : place,
        ),
      ),
    );
  }
}
