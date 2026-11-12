import 'dart:async';

import 'package:flutter/material.dart' hide StepState;
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/routing/app_routes.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/widgets/message_banner.dart';
import 'package:shoot_mobile/core/widgets/progress_bar.dart';
import 'package:shoot_mobile/core/widgets/secondary_button.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';
import 'package:shoot_mobile/core/widgets/shoot_panel.dart';
import 'package:shoot_mobile/core/widgets/shoot_row.dart';
import 'package:shoot_mobile/core/widgets/status_badge.dart';
import 'package:shoot_mobile/core/widgets/step_strip.dart';
import 'package:shoot_mobile/core/widgets/text_link.dart';
import 'package:shoot_mobile/core/widgets/top_hit.dart';
import 'package:shoot_mobile/features/creator_account/domain/entities/creator_account.dart';
import 'package:shoot_mobile/features/creator_account/presentation/cubit/profile_cubit.dart';
import 'package:shoot_mobile/features/creator_account/presentation/widgets/creator_parts.dart';
import 'package:shoot_mobile/features/creator_account/presentation/widgets/step_panels.dart';

/// My profile at `/account/profile`: screen 28 (steps that miss information), 29 (every step
/// done) and 30 (waiting for review, live or hidden), built to boards `S08-creator-account`,
/// `S08b-profile-ready` and `S08c-in-review`. Leaving the screen saves what is edited.
class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key, required this.create});

  final ProfileCubit Function() create;

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  late final ProfileCubit _cubit = widget.create()..load();

  @override
  void dispose() {
    unawaited(_cubit.leave().whenComplete(_cubit.close));
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider.value(
      value: _cubit,
      child: BlocBuilder<ProfileCubit, ProfileState>(
        builder: (context, state) => ProfileView(state: state, cubit: _cubit, onOpen: (path) => context.push(path)),
      ),
    );
  }
}

class ProfileView extends StatelessWidget {
  const ProfileView({super.key, required this.state, required this.cubit, required this.onOpen});

  final ProfileState state;
  final ProfileCubit cubit;
  final void Function(String path) onOpen;

  @override
  Widget build(BuildContext context) {
    return switch (state) {
      ProfileLoading() => const CreatorLoading(),
      ProfileFailed(:final failure) => creatorFailure(failure, cubit.load),
      final ProfileReady s =>
        s.inReview
            ? _ReviewView(state: s, cubit: cubit, onOpen: onOpen)
            : _EditView(state: s, cubit: cubit, onOpen: onOpen),
    };
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.state, required this.title});

  final ProfileReady state;
  final String title;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = state.profile;
    final badge = statusBadge(context, p.status);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 10,
      children: [
        CreatorTitle(title, meta: l10n.caProfileCode(p.code)),
        Wrap(
          spacing: 8,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            StatusBadge(label: badge.label, tone: badge.tone),
            if (!p.status.isPublic) MetaText(l10n.caProfileDraftNote),
          ],
        ),
        Row(
          spacing: 12,
          children: [
            Expanded(
              child: ProgressBar(value: p.strength / 100, label: l10n.caProfileStrengthLabel),
            ),
            MetaText(l10n.caStrengthValue(p.strength)),
          ],
        ),
      ],
    );
  }
}

/// Screens 28 and 29.
class _EditView extends StatelessWidget {
  const _EditView({required this.state, required this.cubit, required this.onOpen});

  final ProfileReady state;
  final ProfileCubit cubit;
  final void Function(String path) onOpen;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = state.profile;
    final needing = p.needing;
    final children = <Widget>[
      _Header(state: state, title: l10n.caMyProfile),
      if (!state.ready && needing.isNotEmpty)
        MessageBanner(
          tone: BannerTone.attention,
          icon: ShootIcons.alert,
          text:
              '${l10n.caIncompleteMessage} '
              '${l10n.caStepsNeedAttention(needing.length)}',
        ),
      if (state.failure != null && state.errors.isEmpty) FailureLine(state.failure!),
    ];
    if (state.ready) {
      children
        ..add(Text(l10n.caAllHere, style: ShootType.title.copyWith(color: context.colors.ink)))
        ..add(
          ShootPanel(
            padding: const EdgeInsetsDirectional.symmetric(horizontal: 12),
            child: Column(children: [for (final (i, step) in p.steps.indexed) _stepRow(context, step, i)]),
          ),
        )
        ..add(TopHit(label: l10n.caSendForReview, loading: state.busy, onPressed: state.busy ? null : cubit.submit));
    } else {
      final last = state.step == StepKey.values.last;
      children
        ..add(_strip(context))
        ..add(
          StepPanel(
            state: state,
            actions: StepActions(
              edit: cubit.edit,
              pickPhoto: cubit.pickPhoto,
              addSample: (source, specialty) => cubit.addSample(source, specialty: specialty),
              removeSample: cubit.removeSample,
              pickIdentity: cubit.pickIdentity,
              openCalendar: () => onOpen(AppRoutes.accountAvailability),
            ),
          ),
        )
        ..add(_nav(context, last));
      if (last && needing.isNotEmpty) {
        children.add(MetaText(l10n.caSendOffLine(needing.map((s) => stepName(context, s.key)).join(', '))));
      }
    }
    return CreatorShell(child: CreatorBody(children: children));
  }

  Widget _stepRow(BuildContext context, ProfileStep step, int i) {
    final line = stepLine(context, step, state.profile);
    final c = context.colors;
    return ShootRow(
      label: '${step.number}. ${stepName(context, step.key)}',
      divider: i == 0 ? RowDivider.none : RowDivider.top,
      leading: ShootIcon(ShootIcons.check, size: 18, color: line.tone == StepTone.done ? c.accentInk : c.mute),
      trailing: MetaText(line.text),
      onTap: () => cubit.goTo(step.key),
    );
  }

  Widget _strip(BuildContext context) {
    final p = state.profile;
    return Semantics(
      label: context.l10n.caProfileStepsLabel,
      container: true,
      child: StepStrip(
        selected: StepKey.values.indexOf(state.step),
        onSelect: (i) => cubit.goTo(StepKey.values[i]),
        tabs: [
          for (final step in p.steps)
            () {
              final line = stepLine(context, step, p);
              final done = step.state == StepState.done;
              return (
                label: '${done ? '✓' : step.number} ${stepName(context, step.key)}',
                state: line.text,
                tone: line.tone,
              );
            }(),
        ],
      ),
    );
  }

  Widget _nav(BuildContext context, bool last) {
    final l10n = context.l10n;
    final i = StepKey.values.indexOf(state.step);
    final next = i < StepKey.values.length - 1 ? StepKey.values[i + 1] : null;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 10,
      children: [
        if (last)
          TopHit(
            label: l10n.caSendForReview,
            loading: state.busy,
            onPressed: state.busy || !p.canSubmit ? null : cubit.submit,
          ),
        Row(
          spacing: 10,
          children: [
            if (i > 0)
              Expanded(
                child: SecondaryButton(label: l10n.caBack, onPressed: state.busy ? null : cubit.back),
              ),
            if (next != null)
              Expanded(
                child: SecondaryButton(
                  label: l10n.caNextStep(stepName(context, next)),
                  loading: state.busy,
                  onPressed: state.busy ? null : cubit.next,
                ),
              ),
          ],
        ),
      ],
    );
  }

  MyProfile get p => state.profile;
}

/// Screen 30: waiting for review (also live, hidden and suspended).
class _ReviewView extends StatelessWidget {
  const _ReviewView({required this.state, required this.cubit, required this.onOpen});

  final ProfileReady state;
  final ProfileCubit cubit;
  final void Function(String path) onOpen;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = state.profile;
    final title = switch (p.status) {
      ProfileStatus.live || ProfileStatus.liveWithChanges => l10n.caLiveTitle,
      ProfileStatus.paused => l10n.caHiddenTitle,
      ProfileStatus.suspended => l10n.caSuspendedTitle,
      _ => l10n.caInReviewTitle,
    };
    final hidden = p.status == ProfileStatus.paused;
    return CreatorShell(
      child: CreatorBody(
        children: [
          _Header(state: state, title: title),
          if (state.failure != null) FailureLine(state.failure!),
          if (p.reviewNote.isNotEmpty) MessageBanner(tone: BannerTone.attention, text: l10n.caReviewNote(p.reviewNote)),
          if (p.status == ProfileStatus.liveWithChanges || p.hasPendingChanges) MetaText(l10n.caLiveChangesNote),
          if (p.status == ProfileStatus.inReview) _Stages(sentAt: p.submittedAt),
          GroupText(l10n.caWhileYouWait),
          ShootPanel(
            padding: const EdgeInsetsDirectional.symmetric(horizontal: 12),
            child: Column(
              children: [
                ShootRow(label: l10n.caViewPublic, onTap: () => onOpen('/creators/${p.code}')),
                ShootRow(
                  label: l10n.caEditProfile,
                  trailing: MetaText(l10n.caEditNote),
                  divider: RowDivider.top,
                  onTap: cubit.startEditing,
                ),
                ShootRow(
                  label: hidden ? l10n.caShowProfile : l10n.caHideProfile,
                  chevron: false,
                  link: false,
                  divider: RowDivider.top,
                  onTap: () => hidden ? cubit.setHidden(hidden: false) : _confirmHide(context),
                ),
              ],
            ),
          ),
          TopHit(label: l10n.caSetCalendar, chevron: true, onPressed: () => onOpen(AppRoutes.accountAvailability)),
        ],
      ),
    );
  }

  Future<void> _confirmHide(BuildContext context) async {
    final l10n = context.l10n;
    final ok = await showModalBottomSheet<bool>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (sheet) => ShootSheet(
        label: l10n.caHideTitle,
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 12,
            children: [
              Text(l10n.caHideTitle, style: ShootType.heading.copyWith(color: sheet.colors.ink)),
              MetaText(l10n.caHideBody),
              SecondaryButton(label: l10n.caHideProfile, onPressed: () => Navigator.of(sheet).pop(true)),
              TextLink(label: l10n.caCancel, onTap: () => Navigator.of(sheet).pop(false)),
            ],
          ),
        ),
      ),
    );
    if (ok ?? false) await cubit.setHidden(hidden: true);
  }
}

/// Sent, the team checks it, live.
class _Stages extends StatelessWidget {
  const _Stages({required this.sentAt});

  final DateTime? sentAt;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    final rows = [
      (l10n.caStageSent, sentAt == null ? null : l10n.caSentOn(formatDay(context, sentAt!)), true),
      (l10n.caStageChecking, null, true),
      (l10n.caStageLive, null, false),
    ];
    return ShootPanel(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 10,
        children: [
          for (final (i, (label, meta, reached)) in rows.indexed)
            Row(
              spacing: 12,
              children: [
                Container(
                  width: 24,
                  height: 24,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(shape: BoxShape.circle, color: reached ? c.selected : c.tile),
                  child: Text('${i + 1}', style: ShootType.badge.copyWith(color: reached ? c.accentInk : c.tileInk)),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(label, style: ShootType.row.copyWith(color: c.ink)),
                      if (meta != null) MetaText(meta),
                    ],
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }
}
