import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/l10n/failure_message.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/routing/app_routes.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/widgets/language_action.dart';
import 'package:shoot_mobile/core/widgets/linked_text.dart';
import 'package:shoot_mobile/core/widgets/shoot_header.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon_button.dart';
import 'package:shoot_mobile/core/widgets/wordmark.dart';

/// The pieces the Quick Match and booking screens share (feature 012).

/// `.hd`: back, the wordmark, and the language action.
class QmHeader extends StatelessWidget {
  const QmHeader({super.key, required this.onBack});

  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return ShootHeader(
      leadsWithBack: true,
      leading: ShootIconButton(
        icon: ShootIcons.back,
        label: l10n.backAction,
        onPressed: onBack,
      ),
      middle: Wordmark(
        label: l10n.appTitle,
        onTap: () => context.go(AppRoutes.home),
      ),
      trailing: const [LanguageAction(square: true)],
    );
  }
}

/// Back one screen, or home when there is nothing to go back to (a deep link).
void qmBack(BuildContext context) {
  if (context.canPop()) {
    context.pop();
  } else {
    context.go(AppRoutes.home);
  }
}

/// `Sat 14 Dec` in the app's language (Western digits, as the boards).
String qmDay(BuildContext context, String iso) {
  final locale = Localizations.localeOf(context).languageCode;
  final date = DateTime.parse(iso);
  return DateFormat('EEE d MMM', '${locale}_AE').format(date);
}

/// The step line under the header: "Step 2 of 3 · {summary} · Edit".
class QmStepLine extends StatelessWidget {
  const QmStepLine({
    super.key,
    required this.step,
    required this.summary,
    this.onEdit,
  });

  final int step;
  final String summary;
  final VoidCallback? onEdit;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final meta = ShootType.meta.copyWith(color: context.colors.mute);
    return LinkedText(
      onEdit == null
          ? l10n.qmStepLine(step, summary)
          : '${l10n.qmStepLine(step, summary)} · {edit}',
      style: meta,
      parts: {
        if (onEdit != null)
          'edit': LinkedText.quiet(l10n.qmEditAction, onEdit!),
      },
    );
  }
}

/// The words for a failure of a booking command: the `booking.errors.*` codes first, then the
/// app's general messages (`FailureMessageX`).
String qmFailureText(BuildContext context, Failure failure) {
  final l10n = context.l10n;
  if (failure is ServerFailure) {
    if (failure.fieldCode('body.reason') == 'booking.errors.reason') {
      return l10n.qmErrReason;
    }
  }
  return failure.message(l10n);
}

/// A field's message key (`booking.errors.date`) as words, or `null`.
String? qmFieldText(BuildContext context, String? code) {
  final l10n = context.l10n;
  return switch (code) {
    'booking.errors.date' => l10n.qmErrDate,
    'booking.errors.startTime' => l10n.qmErrTime,
    'booking.errors.venue' => l10n.qmErrVenue,
    _ => null,
  };
}

/// A screen's body: the content scrolls and the one primary action stays at the foot, in view
/// however long the content is (the boards' `margin-top: auto`).
class QmBody extends StatelessWidget {
  const QmBody({super.key, required this.content, required this.bottom});

  final List<Widget> content;
  final Widget bottom;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Expanded(
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: content,
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsetsDirectional.fromSTEB(
            ShootSpace.s3,
            ShootSpace.s4,
            ShootSpace.s3,
            ShootSpace.s4,
          ),
          child: bottom,
        ),
      ],
    );
  }
}
