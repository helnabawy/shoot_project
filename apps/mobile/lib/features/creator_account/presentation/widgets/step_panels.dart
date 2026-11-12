import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/l10n/failure_message.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/widgets/choice_chip.dart';
import 'package:shoot_mobile/core/widgets/message_banner.dart';
import 'package:shoot_mobile/core/widgets/secondary_button.dart';
import 'package:shoot_mobile/core/widgets/shoot_field.dart';
import 'package:shoot_mobile/core/widgets/shoot_image.dart';
import 'package:shoot_mobile/core/widgets/shoot_panel.dart';
import 'package:shoot_mobile/core/widgets/shoot_row.dart';
import 'package:shoot_mobile/core/widgets/status_badge.dart';
import 'package:shoot_mobile/features/creator_account/domain/entities/creator_account.dart';
import 'package:shoot_mobile/features/creator_account/domain/repositories/creator_account_repository.dart';
import 'package:shoot_mobile/features/creator_account/presentation/cubit/profile_cubit.dart';
import 'package:shoot_mobile/features/creator_account/presentation/widgets/creator_parts.dart';

/// What a step panel can ask of the screen.
class StepActions {
  const StepActions({
    required this.edit,
    required this.pickPhoto,
    required this.addSample,
    required this.removeSample,
    required this.pickIdentity,
    required this.openCalendar,
  });

  final void Function(StepKey step, ProfileFields fields) edit;
  final void Function(PickSource source) pickPhoto;
  final void Function(PickSource source, String? specialty) addSample;
  final void Function(int index) removeSample;
  final void Function(IdentityKind kind, PickSource source) pickIdentity;
  final VoidCallback openCalendar;
}

/// The panel of the current step (one at a time). Missing required fields are ringed with a
/// one-line reason (FR-014); a refused save shows its message under the field.
class StepPanel extends StatelessWidget {
  const StepPanel({super.key, required this.state, required this.actions});

  final ProfileReady state;
  final StepActions actions;

  @override
  Widget build(BuildContext context) {
    final children = switch (state.step) {
      StepKey.basics => _basics(context),
      StepKey.about => _about(context),
      StepKey.places => _places(context),
      StepKey.links => _links(context),
      StepKey.samples => _samples(context),
      StepKey.calendar => _calendar(context),
      StepKey.identity => _identity(context),
    };
    return ShootPanel(
      padding: const EdgeInsets.all(16),
      child: Column(
        key: ValueKey('step:${state.step.name}'),
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 14,
        children: [
          ...children,
          if (state.notice case final notice?) _notice(context, notice),
        ],
      ),
    );
  }

  ProfileFields get _f => state.fields;

  bool _missing(String code) =>
      state.profile.step(state.step).required.contains(code);

  /// The one-line reason under a field: a refused save, or "Needed before review".
  String? _error(BuildContext context, String field, {String? alsoMissing}) {
    final code = state.errors[field];
    if (code != null) {
      return ServerFailureText.of(context, code);
    }
    const alias = {'professions': 'personas', 'emirates': 'cities'};
    return _missing(alsoMissing ?? alias[field] ?? field)
        ? context.l10n.caNeededBeforeReview
        : null;
  }

  Widget _notice(BuildContext context, ProfileNotice n) {
    final l10n = context.l10n;
    return MessageBanner(
      tone: BannerTone.error,
      text: switch (n) {
        ProfileNotice.fileTooLarge => l10n.caFileTooLarge,
        ProfileNotice.fileWrongType => l10n.caFileWrongType,
        ProfileNotice.accessDenied => l10n.caAccessDenied,
        ProfileNotice.sampleLimit => l10n.caSampleLimitReached(
          state.profile.sampleLimit,
        ),
      },
    );
  }

  List<Widget> _basics(BuildContext context) {
    final l10n = context.l10n;
    final p = state.profile;
    void edit(ProfileFields f) => actions.edit(StepKey.basics, f);
    return [
      GroupText(l10n.caPhoto),
      Row(
        spacing: 12,
        children: [
          SizedBox.square(
            dimension: 64,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: ShootImage(p.photo, width: 64, height: 64),
            ),
          ),
          Expanded(
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                SecondaryButton(
                  label: l10n.caTakePhoto,
                  onPressed: () => actions.pickPhoto(PickSource.camera),
                ),
                SecondaryButton(
                  label: l10n.caChoosePhoto,
                  onPressed: () => actions.pickPhoto(PickSource.library),
                ),
              ],
            ),
          ),
        ],
      ),
      LocalField(
        label: l10n.caFieldNameEn,
        initial: _f.displayName.en,
        error: _error(context, 'displayName'),
        onChanged: (v) =>
            edit(_f.copyWith(displayName: _f.displayName.copyWith(en: v))),
      ),
      LocalField(
        label: l10n.caFieldNameAr,
        initial: _f.displayName.ar,
        onChanged: (v) =>
            edit(_f.copyWith(displayName: _f.displayName.copyWith(ar: v))),
      ),
      LocalField(
        label: l10n.caFieldBioEn,
        initial: _f.bio.en,
        area: true,
        onChanged: (v) => edit(_f.copyWith(bio: _f.bio.copyWith(en: v))),
      ),
      LocalField(
        label: l10n.caFieldBioAr,
        initial: _f.bio.ar,
        area: true,
        onChanged: (v) => edit(_f.copyWith(bio: _f.bio.copyWith(ar: v))),
      ),
    ];
  }

  List<Widget> _about(BuildContext context) {
    final l10n = context.l10n;
    void edit(ProfileFields f) => actions.edit(StepKey.about, f);
    final error = _error(context, 'gender');
    final countries = state.profile.options.countries;
    final country = countries.where((c) => c.id == _f.nationality).firstOrNull;
    return [
      GroupText(l10n.caFieldGender),
      ChipGroup(
        children: [
          for (final g in Gender.values)
            ShootChip(
              label: g == Gender.woman ? l10n.caGenderWoman : l10n.caGenderMan,
              on: _f.gender == g,
              onTap: () => edit(_f.copyWith(gender: g)),
            ),
        ],
      ),
      if (error != null)
        MetaText(error, color: context.colors.onDanger)
      else
        MetaText(l10n.caGenderNote),
      GroupText(l10n.caFieldNationality),
      ShootRow(
        label: country?.name ?? l10n.caFieldNationality,
        padding: const EdgeInsetsDirectional.symmetric(vertical: 4),
        onTap: () async {
          final picked = await showOptionSheet(
            context,
            title: l10n.caFieldNationality,
            options: countries,
            selected: _f.nationality,
          );
          if (picked != null) edit(_f.copyWith(nationality: picked));
        },
      ),
      LocalField(
        label: l10n.caFieldExperience,
        initial: _f.yearsExperience?.toString() ?? '',
        keyboardType: TextInputType.number,
        onChanged: (v) => edit(_f.copyWith(yearsExperience: int.tryParse(v))),
      ),
    ];
  }

  List<Widget> _places(BuildContext context) {
    final l10n = context.l10n;
    final o = state.profile.options;
    void edit(ProfileFields f) => actions.edit(StepKey.places, f);
    List<String> toggle(List<String> list, String id) {
      if (list.contains(id)) return [...list]..remove(id);
      return [...list, id];
    }

    Widget group(
      String title,
      List<Option> options,
      List<String> chosen,
      ProfileFields Function(List<String>) apply,
      String errorField,
    ) {
      final error = _error(context, errorField);
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 8,
        children: [
          GroupText(title),
          ChipGroup(
            children: [
              for (final opt in options)
                ShootChip(
                  label: opt.name,
                  on: chosen.contains(opt.id),
                  onTap: () => edit(apply(toggle(chosen, opt.id))),
                ),
            ],
          ),
          if (error != null) MetaText(error, color: context.colors.onDanger),
        ],
      );
    }

    final specialties = [
      for (final s in o.specialties)
        if (_f.professions.isEmpty || s.parents.any(_f.professions.contains)) s,
    ];
    return [
      group(
        l10n.caFieldProfessions,
        o.professions,
        _f.professions,
        (v) => _f.copyWith(professions: v),
        'professions',
      ),
      group(
        l10n.caFieldSpecialties,
        specialties,
        _f.specialties,
        (v) => _f.copyWith(specialties: v),
        'specialties',
      ),
      group(
        l10n.caFieldEmirates,
        o.emirates,
        _f.emirates,
        (v) => _f.copyWith(emirates: v),
        'emirates',
      ),
      group(
        l10n.caFieldLanguages,
        o.languages,
        _f.languages,
        (v) => _f.copyWith(languages: v),
        'languages',
      ),
    ];
  }

  /// The links the website offers (brand names, not content).
  static const _platforms = [
    'instagram',
    'linkedin',
    'youtube',
    'tiktok',
    'x',
    'website',
  ];

  List<Widget> _links(BuildContext context) {
    final l10n = context.l10n;
    return [
      for (final platform in _platforms)
        LocalField(
          label: '${_platformName(platform)} · ${l10n.caFieldLinkUrl}',
          initial:
              _f.social.where((s) => s.platform == platform).firstOrNull?.url ??
              '',
          keyboardType: TextInputType.url,
          onChanged: (v) {
            final others = _f.social.where((s) => s.platform != platform);
            actions.edit(
              StepKey.links,
              _f.copyWith(
                social: [
                  ...others,
                  if (v.trim().isNotEmpty)
                    SocialLink(platform: platform, url: v.trim()),
                ],
              ),
            );
          },
        ),
    ];
  }

  static String _platformName(String platform) => switch (platform) {
    'x' => 'X',
    'tiktok' => 'TikTok',
    'linkedin' => 'LinkedIn',
    'youtube' => 'YouTube',
    _ => platform[0].toUpperCase() + platform.substring(1),
  };

  List<Widget> _samples(BuildContext context) {
    final l10n = context.l10n;
    final p = state.profile;
    final atLimit = p.samples.length >= p.sampleLimit;
    return [
      for (final (i, s) in p.samples.indexed)
        Row(
          spacing: 12,
          children: [
            SizedBox.square(
              dimension: 56,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: ShootImage(s.image, width: 56, height: 56),
              ),
            ),
            Expanded(
              child: Text(
                s.caption.en.isEmpty ? s.caption.ar : s.caption.en,
                style: ShootType.row.copyWith(color: context.colors.ink),
              ),
            ),
            SecondaryButton(
              label: l10n.caRemove,
              onPressed: () => actions.removeSample(i),
            ),
          ],
        ),
      if (atLimit) MetaText(l10n.caSampleLimit(p.sampleLimit)),
      SampleAdder(
        specialties: [
          for (final s in p.options.specialties)
            if (p.fields.specialties.contains(s.id)) s,
        ],
        disabled: atLimit,
        onAdd: actions.addSample,
      ),
    ];
  }

  List<Widget> _calendar(BuildContext context) {
    final l10n = context.l10n;
    return [
      Text(
        l10n.caCalendarStepBody,
        style: ShootType.body.copyWith(color: context.colors.bodyInk),
      ),
      SecondaryButton(
        label: l10n.caAvailability,
        onPressed: actions.openCalendar,
      ),
    ];
  }

  List<Widget> _identity(BuildContext context) {
    final l10n = context.l10n;
    return [
      MetaText(l10n.caIdHint),
      for (final kind in IdentityKind.values)
        _IdentityCard(
          title: kind == IdentityKind.emiratesId
              ? l10n.caIdEmiratesId
              : l10n.caIdTradeLicense,
          document: state.profile.identity[kind]!,
          ringed: _missing(
            kind == IdentityKind.emiratesId ? 'emiratesId' : 'tradeLicense',
          ),
          busy: state.busy,
          onPick: (source) => actions.pickIdentity(kind, source),
        ),
    ];
  }
}

/// Maps a problem code (a message key) to its words.
abstract final class ServerFailureText {
  static String of(BuildContext context, String code) =>
      ProblemCode.fromWire(code)?.message(context.l10n) ??
      context.l10n.problemInvalidInput;
}

class _IdentityCard extends StatelessWidget {
  const _IdentityCard({
    required this.title,
    required this.document,
    required this.ringed,
    required this.busy,
    required this.onPick,
  });

  final String title;
  final IdentityDocument document;
  final bool ringed;
  final bool busy;
  final void Function(PickSource source) onPick;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    final (label, tone) = switch (document.state) {
      IdentityState.missing => (l10n.caIdMissing, BadgeTone.neutral),
      IdentityState.pending => (l10n.caIdPending, BadgeTone.attention),
      IdentityState.verified => (l10n.caIdVerified, BadgeTone.success),
      IdentityState.rejected => (l10n.caIdRejected, BadgeTone.danger),
    };
    final uploaded = document.state != IdentityState.missing;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border.all(
          color: ringed ? c.onAttention : c.hair,
          width: ringed ? 1.5 : 1,
        ),
        borderRadius: BorderRadius.circular(9),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 8,
        children: [
          Text(title, style: ShootType.row.copyWith(color: c.ink)),
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: StatusBadge(label: label, tone: tone),
          ),
          if (document.uploadedAt != null)
            MetaText(
              l10n.caIdUploadedOn(formatDay(context, document.uploadedAt!)),
            ),
          if (document.note.isNotEmpty)
            MetaText(l10n.caIdNote(document.note), color: c.onDanger),
          if (ringed && !uploaded) MetaText(l10n.caNeededBeforeReview),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              SecondaryButton(
                label: uploaded ? l10n.caUploadAgain : l10n.caUpload,
                onPressed: busy ? null : () => onPick(PickSource.files),
              ),
              SecondaryButton(
                label: l10n.caTakePhoto,
                onPressed: busy ? null : () => onPick(PickSource.camera),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// A text field that keeps its own controller, so typing is never interrupted by a rebuild.
class LocalField extends StatefulWidget {
  const LocalField({
    super.key,
    required this.label,
    required this.initial,
    required this.onChanged,
    this.error,
    this.area = false,
    this.keyboardType,
  });

  final String label;
  final String initial;
  final ValueChanged<String> onChanged;
  final String? error;
  final bool area;
  final TextInputType? keyboardType;

  @override
  State<LocalField> createState() => _LocalFieldState();
}

class _LocalFieldState extends State<LocalField> {
  late final TextEditingController _controller = TextEditingController(
    text: widget.initial,
  );

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return widget.area
        ? ShootTextArea(
            label: widget.label,
            controller: _controller,
            error: widget.error,
            onChanged: widget.onChanged,
          )
        : ShootField(
            label: widget.label,
            controller: _controller,
            error: widget.error,
            keyboardType: widget.keyboardType,
            onChanged: widget.onChanged,
          );
  }
}

/// "Add a sample": the specialty it shows (from the profile's own), then the camera or library.
class SampleAdder extends StatefulWidget {
  const SampleAdder({
    super.key,
    required this.specialties,
    required this.disabled,
    required this.onAdd,
  });

  final List<Option> specialties;
  final bool disabled;
  final void Function(PickSource source, String? specialty) onAdd;

  @override
  State<SampleAdder> createState() => _SampleAdderState();
}

class _SampleAdderState extends State<SampleAdder> {
  String? _specialty;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 8,
      children: [
        if (widget.specialties.isNotEmpty)
          ChipGroup(
            children: [
              for (final s in widget.specialties)
                ShootChip(
                  label: s.name,
                  on: _specialty == s.id,
                  onTap: () => setState(
                    () => _specialty = _specialty == s.id ? null : s.id,
                  ),
                ),
            ],
          ),
        SecondaryButton(
          label: l10n.caAddSample,
          onPressed: widget.disabled
              ? null
              : () => widget.onAdd(PickSource.library, _specialty),
        ),
      ],
    );
  }
}

/// A sheet of single choices; returns the chosen id.
Future<String?> showOptionSheet(
  BuildContext context, {
  required String title,
  required List<Option> options,
  String? selected,
}) {
  return showModalBottomSheet<String>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (sheet) => ShootSheet(
      label: title,
      child: SafeArea(
        child: ConstrainedBox(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.sizeOf(sheet).height * .7,
          ),
          child: ListView(
            padding: const EdgeInsetsDirectional.symmetric(horizontal: 20),
            children: [
              for (final o in options)
                ShootRow(
                  label: o.name,
                  chevron: false,
                  link: false,
                  selected: o.id == selected,
                  onTap: () => Navigator.of(sheet).pop(o.id),
                ),
            ],
          ),
        ),
      ),
    ),
  );
}
