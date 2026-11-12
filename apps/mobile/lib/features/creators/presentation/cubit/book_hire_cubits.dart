import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/usecase/use_case.dart';
import 'package:shoot_mobile/features/creators/domain/entities/creators.dart';
import 'package:shoot_mobile/features/creators/domain/usecases/creator_use_cases.dart';
import 'package:shoot_mobile/features/creators/domain/usecases/get_brief_context.dart';
import 'package:shoot_mobile/features/creators/presentation/cubit/load_state.dart';
import 'package:shoot_mobile/features/site/domain/entities/brief_builder.dart';

/// What screen 17 needs: the creator and the brief builder.
final class BookData extends Equatable {
  const BookData({required this.profile, required this.context});

  final CreatorProfile profile;
  final BriefContext context;

  @override
  List<Object?> get props => [profile, context];
}

/// Loads screen 17's data; the brief itself is a `BriefCubit` made once this is done.
class BookCubit extends Cubit<LoadState<BookData>> {
  BookCubit({
    required GetCreatorProfile getProfile,
    required GetBriefContext getContext,
    required this.code,
  }) : _getProfile = getProfile,
       _getContext = getContext,
       super(const LoadInProgress());

  final GetCreatorProfile _getProfile;
  final GetBriefContext _getContext;
  final String code;

  Future<void> load() async {
    emit(const LoadInProgress());
    final results = await Future.wait([
      _getProfile(code),
      _getContext(const NoParams()),
    ]);
    final profile = results[0] as Result<CreatorProfile>;
    final context = results[1] as Result<BriefContext>;
    switch ((profile, context)) {
      case (Err(:final failure), _):
        emit(LoadState.of<BookData>(Err(failure)));
      case (_, Err(:final failure)):
        // A missing brief builder is not a missing creator.
        emit(
          LoadFailed(
            failure is NotFoundFailure ? const UnexpectedFailure() : failure,
          ),
        );
      case (Ok(value: final p), Ok(value: final c)):
        emit(LoadDone(BookData(profile: p, context: c)));
    }
  }
}

/// What screen 19 shows: the page, the WhatsApp number and which question is open.
final class HireData extends Equatable {
  const HireData({
    required this.page,
    required this.whatsappNumber,
    this.expanded,
  });

  final HirePage page;
  final String? whatsappNumber;

  /// The open question, or `null`.
  final int? expanded;

  BriefBuilderConfig? get builder => page.builder;

  @override
  List<Object?> get props => [page, whatsappNumber, expanded];
}

/// Screen 19 (MC-US5).
class HireCubit extends Cubit<LoadState<HireData>> {
  HireCubit({
    required GetHirePage getHirePage,
    required GetWhatsappNumber getWhatsappNumber,
    required this.slug,
  }) : _getHirePage = getHirePage,
       _getWhatsappNumber = getWhatsappNumber,
       super(const LoadInProgress());

  final GetHirePage _getHirePage;
  final GetWhatsappNumber _getWhatsappNumber;
  final String slug;

  Future<void> load() async {
    emit(const LoadInProgress());
    final page = await _getHirePage(slug);
    switch (page) {
      case Err(:final failure):
        emit(LoadState.of<HireData>(Err(failure)));
      case Ok(:final value):
        final number = switch (await _getWhatsappNumber(const NoParams())) {
          Ok(:final value) => value,
          Err() => null,
        };
        emit(LoadDone(HireData(page: value, whatsappNumber: number)));
    }
  }

  /// Opens question [index]; the open one again closes it.
  void toggle(int index) {
    final current = state;
    if (current is! LoadDone<HireData>) return;
    final data = current.value;
    emit(
      LoadDone(
        HireData(
          page: data.page,
          whatsappNumber: data.whatsappNumber,
          expanded: data.expanded == index ? null : index,
        ),
      ),
    );
  }
}
