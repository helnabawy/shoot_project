import 'package:equatable/equatable.dart';
import 'package:shoot_mobile/core/media/image_ref.dart';

/// The creator's own account (feature 014). Pure Dart: what the screens need, decoded from
/// `packages/domain/src/api/v1/creator-account.ts`. Enums keep their wire value and decode an
/// unknown one to a safe case, so a new server value never breaks an older app.

enum ProfileStatus {
  draft('draft'),
  inReview('in-review'),
  live('live'),
  liveWithChanges('live-with-changes'),
  paused('paused'),
  suspended('suspended');

  const ProfileStatus(this.wire);
  final String wire;

  static ProfileStatus fromWire(String value) => values.firstWhere(
    (v) => v.wire == value,
    orElse: () => ProfileStatus.draft,
  );

  /// Clients can see the profile.
  bool get isPublic => this == live || this == liveWithChanges;
}

/// The seven steps, in order.
enum StepKey {
  basics,
  about,
  places,
  links,
  samples,
  calendar,
  identity;

  static StepKey? fromWire(String value) {
    for (final step in values) {
      if (step.name == value) return step;
    }
    return null;
  }

  /// The step a form field (or the field of an error such as `body.gender`) belongs to.
  static StepKey? ofField(String field) {
    final name = field.startsWith('body.') ? field.substring(5) : field;
    return switch (name.split('.').first) {
      'displayName' || 'bio' || 'photo' => basics,
      'gender' || 'nationality' || 'yearsExperience' => about,
      'professions' || 'specialties' || 'emirates' || 'languages' => places,
      'social' => links,
      'samples' || 'file' => samples,
      'emiratesId' || 'tradeLicense' || 'document' => identity,
      _ => null,
    };
  }
}

enum StepState {
  needs,
  recommended,
  done;

  static StepState fromWire(String value) => values.firstWhere(
    (v) => v.name == value,
    orElse: () => StepState.recommended,
  );
}

enum IdentityKind {
  emiratesId('emirates-id'),
  tradeLicense('trade-license');

  const IdentityKind(this.wire);
  final String wire;
}

enum IdentityState {
  missing,
  pending,
  verified,
  rejected;

  static IdentityState fromWire(String value) => values.firstWhere(
    (v) => v.name == value,
    orElse: () => IdentityState.missing,
  );
}

enum Gender {
  woman,
  man;

  static Gender? fromWire(String? value) {
    for (final g in values) {
      if (g.name == value) return g;
    }
    return null;
  }
}

/// A text in both languages.
final class LocalText extends Equatable {
  const LocalText({this.en = '', this.ar = ''});

  final String en;
  final String ar;

  LocalText copyWith({String? en, String? ar}) =>
      LocalText(en: en ?? this.en, ar: ar ?? this.ar);

  Map<String, Object?> toJson() => {'en': en, 'ar': ar};

  @override
  List<Object?> get props => [en, ar];
}

final class ProfileStep extends Equatable {
  const ProfileStep({
    required this.key,
    required this.number,
    required this.state,
    required this.required,
    required this.recommended,
  });

  final StepKey key;
  final int number;
  final StepState state;

  /// Review fields still missing (`gender`, `languages`, `emiratesId` …).
  final List<String> required;

  /// Strength items still missing (`bio`, `photo`, `sample` …).
  final List<String> recommended;

  @override
  List<Object?> get props => [key, number, state, required, recommended];
}

final class IdentityDocument extends Equatable {
  const IdentityDocument({
    required this.state,
    required this.uploadedAt,
    required this.note,
  });

  final IdentityState state;
  final DateTime? uploadedAt;
  final String note;

  @override
  List<Object?> get props => [state, uploadedAt, note];
}

final class ProfileSample extends Equatable {
  const ProfileSample({
    required this.id,
    required this.isVideo,
    required this.image,
    required this.videoUrl,
    required this.caption,
    required this.specialty,
  });

  final String id;
  final bool isVideo;
  final ImageRef? image;
  final String videoUrl;
  final LocalText caption;
  final String? specialty;

  @override
  List<Object?> get props => [id, isVideo, image, videoUrl, caption, specialty];
}

final class Option extends Equatable {
  const Option({required this.id, required this.name, this.parents = const []});

  final String id;
  final String name;

  /// Professions a specialty belongs to.
  final List<String> parents;

  @override
  List<Object?> get props => [id, name, parents];
}

final class ProfileOptions extends Equatable {
  const ProfileOptions({
    required this.professions,
    required this.specialties,
    required this.emirates,
    required this.languages,
    required this.countries,
  });

  final List<Option> professions;
  final List<Option> specialties;
  final List<Option> emirates;
  final List<Option> languages;
  final List<Option> countries;

  @override
  List<Object?> get props => [
    professions,
    specialties,
    emirates,
    languages,
    countries,
  ];
}

final class SocialLink extends Equatable {
  const SocialLink({required this.platform, required this.url});

  final String platform;
  final String url;

  Map<String, Object?> toJson() => {'platform': platform, 'url': url};

  @override
  List<Object?> get props => [platform, url];
}

/// The editable fields. [toPatch] sends only the fields of the steps being left.
final class ProfileFields extends Equatable {
  const ProfileFields({
    this.displayName = const LocalText(),
    this.bio = const LocalText(),
    this.gender,
    this.nationality,
    this.yearsExperience,
    this.professions = const [],
    this.specialties = const [],
    this.emirates = const [],
    this.languages = const [],
    this.social = const [],
  });

  final LocalText displayName;
  final LocalText bio;
  final Gender? gender;
  final String? nationality;
  final int? yearsExperience;
  final List<String> professions;
  final List<String> specialties;
  final List<String> emirates;
  final List<String> languages;
  final List<SocialLink> social;

  ProfileFields copyWith({
    LocalText? displayName,
    LocalText? bio,
    Gender? gender,
    String? nationality,
    int? yearsExperience,
    List<String>? professions,
    List<String>? specialties,
    List<String>? emirates,
    List<String>? languages,
    List<SocialLink>? social,
  }) => ProfileFields(
    displayName: displayName ?? this.displayName,
    bio: bio ?? this.bio,
    gender: gender ?? this.gender,
    nationality: nationality ?? this.nationality,
    yearsExperience: yearsExperience ?? this.yearsExperience,
    professions: professions ?? this.professions,
    specialties: specialties ?? this.specialties,
    emirates: emirates ?? this.emirates,
    languages: languages ?? this.languages,
    social: social ?? this.social,
  );

  /// `profilePatchV1` for the fields of [steps]; gender is left out until chosen (it is required
  /// and has no empty value on the wire).
  Map<String, Object?> toPatch(Set<StepKey> steps) => {
    if (steps.contains(StepKey.basics)) ...{
      'displayName': displayName.toJson(),
      'bio': bio.toJson(),
    },
    if (steps.contains(StepKey.about)) ...{
      'gender': ?gender?.name,
      'nationality': nationality,
      'yearsExperience': yearsExperience,
    },
    if (steps.contains(StepKey.places)) ...{
      'professions': professions,
      'specialties': specialties,
      'emirates': emirates,
      'languages': languages,
    },
    if (steps.contains(StepKey.links))
      'social': [for (final s in social) s.toJson()],
  };

  @override
  List<Object?> get props => [
    displayName,
    bio,
    gender,
    nationality,
    yearsExperience,
    professions,
    specialties,
    emirates,
    languages,
    social,
  ];
}

final class MyProfile extends Equatable {
  const MyProfile({
    required this.code,
    required this.status,
    required this.submittedAt,
    required this.reviewNote,
    required this.strength,
    required this.canSubmit,
    required this.hasPendingChanges,
    required this.fields,
    required this.photo,
    required this.samples,
    required this.identity,
    required this.steps,
    required this.options,
    required this.sampleLimit,
    required this.identityBytes,
  });

  final String code;
  final ProfileStatus status;
  final DateTime? submittedAt;
  final String reviewNote;

  /// 0 to 100.
  final int strength;
  final bool canSubmit;
  final bool hasPendingChanges;
  final ProfileFields fields;
  final ImageRef? photo;
  final List<ProfileSample> samples;
  final Map<IdentityKind, IdentityDocument> identity;
  final List<ProfileStep> steps;
  final ProfileOptions options;
  final int sampleLimit;
  final int identityBytes;

  ProfileStep step(StepKey key) => steps.firstWhere((s) => s.key == key);

  /// Steps that miss something required.
  List<ProfileStep> get needing =>
      steps.where((s) => s.state == StepState.needs).toList();

  @override
  List<Object?> get props => [
    code,
    status,
    submittedAt,
    reviewNote,
    strength,
    canSubmit,
    hasPendingChanges,
    fields,
    photo,
    samples,
    identity,
    steps,
    options,
    sampleLimit,
    identityBytes,
  ];
}

enum RequestAnswer {
  pending,
  confirmed,
  declined,
  lapsed;

  static RequestAnswer fromWire(String value) => values.firstWhere(
    (v) => v.name == value,
    orElse: () => RequestAnswer.pending,
  );
}

/// One booking as the creator sees it: the client by first name only, never a phone number.
final class BookingRequest extends Equatable {
  const BookingRequest({
    required this.ref,
    required this.quotation,
    required this.occasion,
    required this.emirate,
    required this.date,
    required this.profession,
    required this.client,
    required this.respondBy,
    required this.state,
    required this.answer,
    required this.canDeliver,
    required this.paid,
  });

  final String ref;
  final String? quotation;
  final String occasion;
  final String emirate;
  final DateTime date;
  final String profession;
  final String client;
  final DateTime? respondBy;
  final String state;
  final RequestAnswer answer;
  final bool canDeliver;
  final bool paid;

  @override
  List<Object?> get props => [
    ref,
    quotation,
    occasion,
    emirate,
    date,
    profession,
    client,
    respondBy,
    state,
    answer,
    canDeliver,
    paid,
  ];
}

final class BookingUpdate extends Equatable {
  const BookingUpdate({
    required this.id,
    required this.event,
    required this.ref,
    required this.createdAt,
    required this.read,
  });

  final String id;
  final String event;
  final String? ref;
  final DateTime createdAt;
  final bool read;

  @override
  List<Object?> get props => [id, event, ref, createdAt, read];
}

final class CreatorBookings extends Equatable {
  const CreatorBookings({
    required this.updates,
    required this.waiting,
    required this.upcoming,
    required this.done,
  });

  final List<BookingUpdate> updates;
  final List<BookingRequest> waiting;
  final List<BookingRequest> upcoming;
  final List<BookingRequest> done;

  @override
  List<Object?> get props => [updates, waiting, upcoming, done];
}

final class Need extends Equatable {
  const Need({
    required this.step,
    required this.required,
    required this.recommended,
  });

  final StepKey step;
  final List<String> required;
  final List<String> recommended;

  @override
  List<Object?> get props => [step, required, recommended];
}

final class CreatorAccount extends Equatable {
  const CreatorAccount({
    required this.name,
    required this.code,
    required this.professions,
    required this.status,
    required this.strength,
    required this.needs,
    required this.waiting,
    required this.deliverable,
    required this.waitingCount,
    required this.upcomingCount,
    required this.blockedDays,
  });

  final String name;
  final String? code;
  final List<String> professions;
  final ProfileStatus status;
  final int strength;
  final List<Need> needs;
  final BookingRequest? waiting;
  final BookingRequest? deliverable;
  final int waitingCount;
  final int upcomingCount;
  final int blockedDays;

  @override
  List<Object?> get props => [
    name,
    code,
    professions,
    status,
    strength,
    needs,
    waiting,
    deliverable,
    waitingCount,
    upcomingCount,
    blockedDays,
  ];
}

enum DayKind { blocked, booked }

final class Availability extends Equatable {
  const Availability({
    required this.today,
    required this.windowDays,
    required this.days,
    required this.blockedCount,
  });

  /// Today in the business time zone (a calendar date, no time).
  final DateTime today;
  final int windowDays;

  /// Only the days that are not free, by calendar date.
  final Map<DateTime, DayKind> days;
  final int blockedCount;

  DateTime get last =>
      DateTime(today.year, today.month, today.day + windowDays - 1);

  bool inWindow(DateTime day) {
    final d = DateTime(day.year, day.month, day.day);
    return !d.isBefore(today) && !d.isAfter(last);
  }

  DayKind? kindOf(DateTime day) => days[DateTime(day.year, day.month, day.day)];

  Availability withDay(DateTime day, bool blocked) {
    final key = DateTime(day.year, day.month, day.day);
    final next = {...days};
    if (blocked) {
      next[key] = DayKind.blocked;
    } else {
      next.remove(key);
    }
    return Availability(
      today: today,
      windowDays: windowDays,
      days: next,
      blockedCount: next.entries
          .where((e) => e.value == DayKind.blocked && inWindow(e.key))
          .length,
    );
  }

  @override
  List<Object?> get props => [today, windowDays, days, blockedCount];
}
