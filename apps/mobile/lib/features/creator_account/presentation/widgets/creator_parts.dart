import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/l10n/failure_message.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/routing/app_routes.dart';
import 'package:shoot_mobile/core/routing/error_page.dart';
import 'package:shoot_mobile/core/routing/not_found_page.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/widgets/language_action.dart';
import 'package:shoot_mobile/core/widgets/message_banner.dart';
import 'package:shoot_mobile/core/widgets/shoot_header.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon_button.dart';
import 'package:shoot_mobile/core/widgets/shoot_scaffold.dart';
import 'package:shoot_mobile/core/widgets/status_badge.dart';
import 'package:shoot_mobile/core/widgets/step_strip.dart';
import 'package:shoot_mobile/core/widgets/wordmark.dart';
import 'package:shoot_mobile/features/creator_account/domain/entities/creator_account.dart';

/// The header and column every creator screen shares: a back button, the wordmark, the language
/// switch, then the screen's scrolling content.
class CreatorShell extends StatelessWidget {
  const CreatorShell({super.key, required this.child, this.onBack});

  final Widget child;

  /// Defaults to the account (or home when there is nothing to go back to).
  final VoidCallback? onBack;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return ShootScaffold(
      child: Column(
        children: [
          ShootHeader(
            leadsWithBack: true,
            leading: ShootIconButton(
              icon: ShootIcons.back,
              label: l10n.backAction,
              onPressed:
                  onBack ??
                  () => context.canPop()
                      ? context.pop()
                      : context.go(AppRoutes.account),
            ),
            middle: Wordmark(
              label: l10n.appTitle,
              onTap: () => context.go(AppRoutes.home),
            ),
            trailing: const [LanguageAction(square: true)],
          ),
          Expanded(child: child),
        ],
      ),
    );
  }
}

/// The screen's content: a scrolling column, 20 at the sides.
class CreatorBody extends StatelessWidget {
  const CreatorBody({super.key, required this.children, this.spacing = 14});

  final List<Widget> children;
  final double spacing;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsetsDirectional.fromSTEB(20, 8, 20, 32),
      children: [
        for (final (i, child) in children.indexed) ...[
          if (i > 0) SizedBox(height: spacing),
          child,
        ],
      ],
    );
  }
}

class CreatorLoading extends StatelessWidget {
  const CreatorLoading({super.key});

  @override
  Widget build(BuildContext context) => CreatorShell(
    child: Center(
      child: Semantics(
        label: context.l10n.caSaving,
        child: const CircularProgressIndicator(strokeWidth: 2),
      ),
    ),
  );
}

/// A failed read: not found is screen 37, anything else screen 39 with "Try again".
Widget creatorFailure(Failure failure, VoidCallback onRetry) =>
    failure is NotFoundFailure
    ? const NotFoundPage()
    : ErrorPage(onRetry: onRetry);

/// A one-line message for a failure that happened while the screen stays up.
class FailureLine extends StatelessWidget {
  const FailureLine(this.failure, {super.key});

  final Failure failure;

  @override
  Widget build(BuildContext context) => MessageBanner(
    text: failure.message(context.l10n),
    tone: BannerTone.error,
  );
}

class GroupText extends StatelessWidget {
  const GroupText(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) => Text(
    text.toUpperCase(),
    style: ShootType.groupLabel.copyWith(color: context.colors.mute),
  );
}

class MetaText extends StatelessWidget {
  const MetaText(this.text, {super.key, this.color});

  final String text;
  final Color? color;

  @override
  Widget build(BuildContext context) => Text(
    text,
    style: ShootType.meta.copyWith(color: color ?? context.colors.mute),
  );
}

/// The screen title (display type) with an optional line under it.
class CreatorTitle extends StatelessWidget {
  const CreatorTitle(this.title, {super.key, this.meta});

  final String title;
  final String? meta;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Semantics(
        header: true,
        child: Text(
          title,
          style: ShootType.display.copyWith(color: context.colors.ink),
        ),
      ),
      if (meta != null) ...[const SizedBox(height: 6), MetaText(meta!)],
    ],
  );
}

String formatDay(BuildContext context, DateTime day) =>
    DateFormat.MMMEd(Localizations.localeOf(context).toString()).format(day);

String formatTime(BuildContext context, DateTime time) =>
    DateFormat.MMMd(Localizations.localeOf(context).toString())
        .add_Hm()
        .format(time.toLocal());

/// The badge for a profile status.
({String label, BadgeTone tone}) statusBadge(
  BuildContext context,
  ProfileStatus status,
) {
  final l10n = context.l10n;
  return switch (status) {
    ProfileStatus.draft => (label: l10n.caStatusDraft, tone: BadgeTone.neutral),
    ProfileStatus.inReview => (
      label: l10n.caStatusInReview,
      tone: BadgeTone.attention,
    ),
    ProfileStatus.live => (label: l10n.caStatusLive, tone: BadgeTone.success),
    ProfileStatus.liveWithChanges => (
      label: l10n.caStatusLiveChanges,
      tone: BadgeTone.success,
    ),
    ProfileStatus.paused => (
      label: l10n.caStatusHidden,
      tone: BadgeTone.neutral,
    ),
    ProfileStatus.suspended => (
      label: l10n.caStatusSuspended,
      tone: BadgeTone.danger,
    ),
  };
}

String stepName(BuildContext context, StepKey key) {
  final l10n = context.l10n;
  return switch (key) {
    StepKey.basics => l10n.caStepBasics,
    StepKey.about => l10n.caStepAbout,
    StepKey.places => l10n.caStepPlaces,
    StepKey.links => l10n.caStepLinks,
    StepKey.samples => l10n.caStepSamples,
    StepKey.calendar => l10n.caStepCalendar,
    StepKey.identity => l10n.caStepIdentity,
  };
}

/// What a required item needs, in words (the server sends the code only).
String needText(BuildContext context, String code) {
  final l10n = context.l10n;
  return switch (code) {
    'displayName' => l10n.caNeedsDisplayName,
    'gender' => l10n.caNeedsGender,
    'personas' => l10n.caNeedsProfessions,
    'specialties' => l10n.caNeedsSpecialties,
    'cities' => l10n.caNeedsEmirates,
    'languages' => l10n.caNeedsLanguages,
    'emiratesId' => l10n.caNeedsEmiratesId,
    'tradeLicense' => l10n.caNeedsTradeLicense,
    _ => l10n.caNeedsOther,
  };
}

/// What a recommended item suggests, in words.
String recommendedText(BuildContext context, String code) {
  final l10n = context.l10n;
  return switch (code) {
    'photo' => l10n.caAddPhoto,
    'bio' => l10n.caAddBio,
    'nationality' => l10n.caAddNationality,
    'yearsExperience' => l10n.caAddExperience,
    'link' => l10n.caAddLink,
    'sample' => l10n.caAddSample,
    _ => l10n.caAddBio,
  };
}

/// A tab's state line (FR-012): required and missing, recommended, or done, always in words.
({String text, StepTone tone}) stepLine(
  BuildContext context,
  ProfileStep step,
  MyProfile profile,
) {
  final l10n = context.l10n;
  if (step.required.isNotEmpty) {
    return (
      text: needText(context, step.required.first),
      tone: StepTone.attention,
    );
  }
  if (step.recommended.isNotEmpty) {
    return (
      text: recommendedText(context, step.recommended.first),
      tone: StepTone.neutral,
    );
  }
  final text = switch (step.key) {
    StepKey.samples => l10n.caStepSamplesCount(profile.samples.length),
    _ => l10n.caStepDone,
  };
  return (text: text, tone: StepTone.done);
}
