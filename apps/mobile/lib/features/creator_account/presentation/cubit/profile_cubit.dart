import 'dart:async';

import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/creator_account/domain/entities/creator_account.dart';
import 'package:shoot_mobile/features/creator_account/domain/repositories/creator_account_repository.dart';

/// A one-line reason shown under the step (never a failure from the server).
enum ProfileNotice { fileTooLarge, fileWrongType, accessDenied, sampleLimit }

sealed class ProfileState extends Equatable {
  const ProfileState();

  @override
  List<Object?> get props => [];
}

final class ProfileLoading extends ProfileState {
  const ProfileLoading();
}

final class ProfileFailed extends ProfileState {
  const ProfileFailed(this.failure);

  final Failure failure;

  @override
  List<Object?> get props => [failure];
}

/// My profile (screens 28, 29 and 30). [fields] is what is on screen (saved values plus the
/// unsaved edits of [dirty] steps); [profile] is what the server last answered.
final class ProfileReady extends ProfileState {
  const ProfileReady({
    required this.profile,
    required this.fields,
    required this.step,
    this.dirty = const {},
    this.strip = false,
    this.busy = false,
    this.errors = const {},
    this.failure,
    this.notice,
  });

  final MyProfile profile;
  final ProfileFields fields;
  final StepKey step;
  final Set<StepKey> dirty;

  /// The creator opened a step: the strip and its panel show instead of the list or the review.
  final bool strip;
  final bool busy;

  /// Field (`gender`) to message code, from a refused save.
  final Map<String, String> errors;
  final Failure? failure;
  final ProfileNotice? notice;

  /// Screen 30: sent for review or live, and the creator is not editing.
  bool get inReview =>
      !strip &&
      (profile.status == ProfileStatus.inReview ||
          profile.status.isPublic ||
          profile.status == ProfileStatus.paused);

  /// Screen 29: nothing required is missing on a draft.
  bool get ready => !strip && !inReview && profile.canSubmit;

  ProfileReady copyWith({
    MyProfile? profile,
    ProfileFields? fields,
    StepKey? step,
    Set<StepKey>? dirty,
    bool? strip,
    bool? busy,
    Map<String, String>? errors,
    Failure? failure,
    bool clearFailure = false,
    ProfileNotice? notice,
    bool clearNotice = false,
  }) => ProfileReady(
    profile: profile ?? this.profile,
    fields: fields ?? this.fields,
    step: step ?? this.step,
    dirty: dirty ?? this.dirty,
    strip: strip ?? this.strip,
    busy: busy ?? this.busy,
    errors: errors ?? this.errors,
    failure: clearFailure ? null : failure ?? this.failure,
    notice: clearNotice ? null : notice ?? this.notice,
  );

  @override
  List<Object?> get props => [
    profile,
    fields,
    step,
    dirty,
    strip,
    busy,
    errors,
    failure,
    notice,
  ];
}

const _identityTypes = {
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
};
const _imageTypes = {'image/jpeg', 'image/png', 'image/webp'};
const _photoBytes = 5 * 1024 * 1024;

class ProfileCubit extends Cubit<ProfileState> {
  ProfileCubit({required this._repository, required this._picker})
    : super(const ProfileLoading());

  final CreatorAccountRepository _repository;
  final FilePicker _picker;

  ProfileReady? get _ready => switch (state) {
    final ProfileReady r => r,
    _ => null,
  };

  Future<void> load() async {
    emit(const ProfileLoading());
    switch (await _repository.profile()) {
      case Ok(:final value):
        emit(_fresh(value));
      case Err(:final failure):
        emit(ProfileFailed(failure));
    }
  }

  ProfileReady _fresh(MyProfile profile) => ProfileReady(
    profile: profile,
    fields: profile.fields,
    step: _firstNeeding(profile),
  );

  StepKey _firstNeeding(MyProfile p) => p.steps
      .firstWhere(
        (s) => s.state == StepState.needs,
        orElse: () => p.steps.first,
      )
      .key;

  /// Opens the first step that needs attention ("Finish my profile").
  void openFirstNeeding() {
    final r = _ready;
    if (r == null) return;
    emit(r.copyWith(step: _firstNeeding(r.profile), strip: true));
  }

  /// Records an edit made on [step] (the fields of other steps are untouched).
  void edit(StepKey step, ProfileFields fields) {
    final r = _ready;
    if (r == null) return;
    emit(
      r.copyWith(
        fields: fields,
        dirty: {...r.dirty, step},
        errors: const {},
        clearFailure: true,
        clearNotice: true,
      ),
    );
  }

  /// Saves the steps edited since the last save. `true` when nothing is left unsaved; on a refused
  /// save the step of the first error opens with its messages and nothing saved is lost.
  Future<bool> save() async {
    final r = _ready;
    if (r == null) return false;
    if (r.dirty.isEmpty) return true;
    emit(r.copyWith(busy: true, clearFailure: true));
    final result = await _repository.saveProfile(r.fields.toPatch(r.dirty));
    final now = _ready ?? r;
    switch (result) {
      case Ok(:final value):
        emit(
          now.copyWith(
            profile: value,
            fields: value.fields,
            dirty: const {},
            busy: false,
            errors: const {},
          ),
        );
        return true;
      case Err(:final failure):
        final errors = <String, String>{};
        StepKey? first;
        if (failure is ServerFailure) {
          for (final f in failure.fields) {
            final name = f.path.startsWith('body.')
                ? f.path.substring(5)
                : f.path;
            errors.putIfAbsent(name, () => f.code);
            first ??= StepKey.ofField(f.path);
          }
        }
        emit(
          now.copyWith(
            busy: false,
            errors: errors,
            failure: failure,
            step: first ?? now.step,
            strip: first != null ? true : now.strip,
          ),
        );
        return false;
    }
  }

  /// Another tab: the step being left is saved first.
  Future<void> goTo(StepKey step) async {
    final r = _ready;
    if (r == null || r.busy) return;
    if (!await save()) return;
    final now = _ready;
    if (now != null) emit(now.copyWith(step: step, strip: true));
  }

  Future<void> next() async {
    final r = _ready;
    if (r == null) return;
    final i = StepKey.values.indexOf(r.step);
    if (i < StepKey.values.length - 1) await goTo(StepKey.values[i + 1]);
  }

  Future<void> back() async {
    final r = _ready;
    if (r == null) return;
    final i = StepKey.values.indexOf(r.step);
    if (i > 0) await goTo(StepKey.values[i - 1]);
  }

  /// Leaving the screen saves what is edited.
  Future<void> leave() async {
    await save();
  }

  /// "Edit my profile" on screen 30.
  void startEditing() {
    final r = _ready;
    if (r != null) emit(r.copyWith(strip: true));
  }

  /// "Send for review": off until nothing required is missing.
  Future<void> submit() async {
    final r = _ready;
    if (r == null || r.busy || !r.profile.canSubmit) return;
    if (!await save()) return;
    final now = _ready!;
    emit(now.copyWith(busy: true));
    switch (await _repository.submit()) {
      case Ok(:final value):
        emit(
          now.copyWith(
            profile: value,
            fields: value.fields,
            busy: false,
            strip: false,
          ),
        );
      case Err(:final failure):
        emit(now.copyWith(busy: false, failure: failure));
    }
  }

  Future<void> setHidden({required bool hidden}) async {
    final r = _ready;
    if (r == null || r.busy) return;
    emit(r.copyWith(busy: true, clearFailure: true));
    switch (await _repository.setHidden(hidden: hidden)) {
      case Ok(:final value):
        emit(
          r.copyWith(
            profile: value,
            fields: r.dirty.isEmpty ? value.fields : r.fields,
            busy: false,
          ),
        );
      case Err(:final failure):
        emit(r.copyWith(busy: false, failure: failure));
    }
  }

  Future<PickedFile?> _pick(PickSource source) async {
    try {
      return await _picker.pick(source);
    } on PickDenied {
      final r = _ready;
      if (r != null) emit(r.copyWith(notice: ProfileNotice.accessDenied));
      return null;
    }
  }

  Future<void> _apply(Future<Result<MyProfile>> Function() call) async {
    final r = _ready;
    if (r == null) return;
    emit(r.copyWith(busy: true, clearFailure: true, clearNotice: true));
    switch (await call()) {
      case Ok(:final value):
        final now = _ready ?? r;
        emit(
          now.copyWith(
            profile: value,
            fields: now.dirty.isEmpty ? value.fields : now.fields,
            busy: false,
          ),
        );
      case Err(:final failure):
        emit((_ready ?? r).copyWith(busy: false, failure: failure));
    }
  }

  /// A profile photo from the camera or the library.
  Future<void> pickPhoto(PickSource source) async {
    final file = await _pick(source);
    final r = _ready;
    if (file == null || r == null) return;
    if (!_imageTypes.contains(file.contentType)) {
      return emit(r.copyWith(notice: ProfileNotice.fileWrongType));
    }
    if (file.bytes.length > _photoBytes) {
      return emit(r.copyWith(notice: ProfileNotice.fileTooLarge));
    }
    await _apply(() => _repository.uploadPhoto(file));
  }

  /// A work sample, tagged with what it shows; "Add a sample" is off at the limit.
  Future<void> addSample(
    PickSource source, {
    String? specialty,
    LocalText caption = const LocalText(),
  }) async {
    final r = _ready;
    if (r == null) return;
    if (r.profile.samples.length >= r.profile.sampleLimit) {
      return emit(r.copyWith(notice: ProfileNotice.sampleLimit));
    }
    final file = await _pick(source);
    final now = _ready;
    if (file == null || now == null) return;
    if (!_imageTypes.contains(file.contentType)) {
      return emit(now.copyWith(notice: ProfileNotice.fileWrongType));
    }
    if (file.bytes.length > _photoBytes) {
      return emit(now.copyWith(notice: ProfileNotice.fileTooLarge));
    }
    await _apply(
      () => _repository.addSample(
        file: file,
        caption: caption,
        specialty: specialty,
      ),
    );
  }

  Future<void> removeSample(int index) =>
      _apply(() => _repository.removeSample(index));

  /// An Emirates ID or trade license (JPEG, PNG, WebP or PDF, up to the server's limit); a
  /// newer upload replaces the older one of the same kind.
  Future<void> pickIdentity(IdentityKind kind, PickSource source) async {
    final file = await _pick(source);
    final r = _ready;
    if (file == null || r == null) return;
    if (!_identityTypes.contains(file.contentType)) {
      return emit(r.copyWith(notice: ProfileNotice.fileWrongType));
    }
    if (file.bytes.length > r.profile.identityBytes) {
      return emit(r.copyWith(notice: ProfileNotice.fileTooLarge));
    }
    await _apply(() => _repository.uploadIdentity(kind, file));
  }
}
