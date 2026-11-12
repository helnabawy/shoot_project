import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/l10n/failure_message.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/routing/app_routes.dart';
import 'package:shoot_mobile/core/routing/error_page.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/widgets/appearance_sheet.dart';
import 'package:shoot_mobile/core/widgets/icon_tile.dart';
import 'package:shoot_mobile/core/widgets/progress_bar.dart';
import 'package:shoot_mobile/core/widgets/secondary_button.dart';
import 'package:shoot_mobile/core/widgets/shoot_field.dart';
import 'package:shoot_mobile/core/widgets/shoot_header.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon_button.dart';
import 'package:shoot_mobile/core/widgets/shoot_panel.dart';
import 'package:shoot_mobile/core/widgets/shoot_scaffold.dart';
import 'package:shoot_mobile/core/widgets/top_hit.dart';
import 'package:shoot_mobile/core/widgets/wordmark.dart';
import 'package:shoot_mobile/features/account/domain/entities/account.dart';
import 'package:shoot_mobile/features/account/presentation/cubit/account_cubit.dart';
import 'package:shoot_mobile/features/account/presentation/widgets/account_parts.dart';
import 'package:shoot_mobile/features/account/presentation/widgets/prefs.dart';

/// Screen 25, built to board `S07b-complete-account`: a one-time checklist (number verified, name,
/// optional email, language and theme) with a progress bar. Only the verified number is required;
/// "Later" closes it for good and "Your details" brings it back (FR-020 to FR-026). Showing it
/// tells the server so it never opens on its own again.
class FinishPage extends StatefulWidget {
  const FinishPage({super.key});

  @override
  State<FinishPage> createState() => _FinishPageState();
}

class _FinishPageState extends State<FinishPage> {
  @override
  void initState() {
    super.initState();
    final cubit = context.read<AccountCubit>();
    if (cubit.state.home == null) {
      unawaited(cubit.load());
    } else {
      // Already loaded (opened from My account): this is the moment it is seen.
      unawaited(cubit.markFinishShown());
    }
  }

  void _close() => context.go(AppRoutes.account);

  Future<void> _edit(FinishKey key) async {
    final cubit = context.read<AccountCubit>();
    cubit.clearFieldError();
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      useSafeArea: true,
      constraints: const BoxConstraints(maxWidth: ShootSize.formColumn),
      builder: (_) => BlocProvider<AccountCubit>.value(
        value: cubit,
        child: _EditSheet(field: key),
      ),
    );
    cubit.clearFieldError();
  }

  /// The first unfinished item, which the primary action works on (FR-022).
  _Step? _next(BuildContext context, AccountHome home) {
    for (final key in [FinishKey.name, FinishKey.email]) {
      if (!(home.item(key)?.done ?? false)) return _Step.fromKey(key);
    }
    return prefsDone(context) ? null : _Step.prefs;
  }

  void _run(_Step step) {
    switch (step) {
      case _Step.name:
        unawaited(_edit(FinishKey.name));
      case _Step.email:
        unawaited(_edit(FinishKey.email));
      case _Step.prefs:
        unawaited(showAppearanceSheet(context));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return BlocConsumer<AccountCubit, AccountState>(
      listenWhen: (a, b) => a.home == null && b.home != null,
      listener: (context, state) =>
          unawaited(context.read<AccountCubit>().markFinishShown()),
      builder: (context, state) {
        final home = state.home;
        if (home == null && state.status == AccountStatus.failed) {
          return ErrorPage(
            onRetry: () => unawaited(context.read<AccountCubit>().load()),
          );
        }
        return ShootScaffold(
          child: Column(
            children: [
              ShootHeader(
                leading: Wordmark(
                  label: l10n.appTitle,
                  onTap: () => context.go(AppRoutes.home),
                ),
                trailing: [
                  ShootTextAction(
                    text: l10n.finishLater,
                    label: l10n.finishLater,
                    onPressed: _close,
                  ),
                ],
              ),
              Expanded(
                child: home == null
                    ? const Center(child: CircularProgressIndicator.adaptive())
                    : _content(context, home),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _content(BuildContext context, AccountHome home) {
    final l10n = context.l10n;
    final c = context.colors;
    final progress = finishProgress(context, home);
    final next = _next(context, home);
    final name = home.item(FinishKey.name);
    final email = home.item(FinishKey.email);
    final prefs = prefsDone(context);
    return Column(
      children: [
        Expanded(
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsetsDirectional.fromSTEB(20, 12, 20, 0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        l10n.finishTitle,
                        style: ShootType.title.copyWith(color: c.ink),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        next == null
                            ? l10n.finishAllDone
                            : l10n.finishBody(
                                progress.done,
                                progress.total - progress.done,
                              ),
                        style: ShootType.body.copyWith(color: c.bodyInk),
                      ),
                      const SizedBox(height: 14),
                      Row(
                        children: [
                          Expanded(
                            child: ProgressBar(
                              value: progress.done / progress.total,
                              label: l10n.finishProgressLabel,
                            ),
                          ),
                          const SizedBox(width: ShootSpace.s3),
                          Text(
                            l10n.accountProgress(progress.done, progress.total),
                            style: ShootType.num(
                              ShootType.meta.copyWith(color: c.mute),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsetsDirectional.fromSTEB(12, 20, 12, 0),
                  child: Semantics(
                    container: true,
                    label: l10n.finishStepsLabel,
                    child: ShootPanel(
                      padding: const EdgeInsets.all(8),
                      child: Column(
                        children: [
                          _StepRow(
                            done: home.item(FinishKey.number)?.done ?? false,
                            title: l10n.finishItemNumber,
                            meta: home.phone == null
                                ? null
                                : ltrIsolate(formatPhone(home.phone!)),
                          ),
                          _StepRow(
                            done: name?.done ?? false,
                            title: l10n.finishItemName,
                            meta: name?.value ?? l10n.finishNameHint,
                            action: (name?.done ?? false)
                                ? l10n.finishActionEdit
                                : l10n.finishActionAdd,
                            onTap: () => unawaited(_edit(FinishKey.name)),
                          ),
                          _StepRow(
                            done: email?.done ?? false,
                            title: l10n.finishItemEmail,
                            meta: email?.value ?? l10n.finishEmailHint,
                            action: (email?.done ?? false)
                                ? l10n.finishActionEdit
                                : l10n.finishActionAdd,
                            onTap: () => unawaited(_edit(FinishKey.email)),
                          ),
                          _StepRow(
                            done: prefs,
                            title: l10n.finishItemPrefs,
                            meta: prefsStatus(context),
                            action: l10n.finishActionSet,
                            onTap: () =>
                                unawaited(showAppearanceSheet(context)),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                if (home.about.isNotEmpty)
                  Padding(
                    padding: const EdgeInsetsDirectional.fromSTEB(
                      20,
                      24,
                      20,
                      0,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          l10n.finishAboutLabel.toUpperCase(),
                          style: ShootType.groupLabel.copyWith(color: c.mute),
                        ),
                        const SizedBox(height: 8),
                        for (final line in home.about)
                          Padding(
                            padding: const EdgeInsetsDirectional.only(
                              bottom: 8,
                            ),
                            child: Row(
                              children: [
                                const IconTile(ShootIcons.check),
                                const SizedBox(width: ShootSpace.s3),
                                Expanded(
                                  child: Text(
                                    line,
                                    style: ShootType.meta.copyWith(
                                      color: c.bodyInk,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsetsDirectional.fromSTEB(12, 8, 12, 18),
          child: TopHit(
            label: switch (next) {
              _Step.name => l10n.finishPrimaryAddName,
              _Step.email => l10n.finishPrimaryAddEmail,
              _Step.prefs => l10n.finishPrimarySetPrefs,
              null => l10n.finishPrimaryDone,
            },
            onPressed: () => next == null ? _close() : _run(next),
          ),
        ),
      ],
    );
  }
}

enum _Step {
  name,
  email,
  prefs;

  static _Step fromKey(FinishKey key) =>
      key == FinishKey.name ? _Step.name : _Step.email;
}

/// `.row` of the checklist: a 30 px tile (ticked when done), two lines and the action.
class _StepRow extends StatelessWidget {
  const _StepRow({
    required this.done,
    required this.title,
    this.meta,
    this.action,
    this.onTap,
  });

  final bool done;
  final String title;
  final String? meta;
  final String? action;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final row = Container(
      constraints: const BoxConstraints(minHeight: 52),
      padding: const EdgeInsetsDirectional.symmetric(
        horizontal: ShootSpace.s2,
        vertical: 6,
      ),
      child: Row(
        children: [
          IconTile(done ? ShootIcons.check : ShootIcons.person),
          const SizedBox(width: ShootSpace.s3),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: ShootType.row.copyWith(color: c.ink)),
                if (meta != null)
                  Text(meta!, style: ShootType.meta.copyWith(color: c.mute)),
              ],
            ),
          ),
          if (action != null)
            ConstrainedBox(
              constraints: const BoxConstraints(minWidth: 44, minHeight: 44),
              child: Center(
                child: Text(
                  action!,
                  style: ShootType.button.copyWith(color: c.accentInk),
                ),
              ),
            ),
        ],
      ),
    );
    final label = [title, ?meta, ?action].where((s) => s.isNotEmpty).join(', ');
    return Semantics(
      container: true,
      button: onTap != null,
      label: label,
      excludeSemantics: true,
      child: onTap == null ? row : InkWell(onTap: onTap, child: row),
    );
  }
}

/// The name or email field in a sheet. A refused save shows one line under the field.
class _EditSheet extends StatefulWidget {
  const _EditSheet({required this.field});

  final FinishKey field;

  @override
  State<_EditSheet> createState() => _EditSheetState();
}

class _EditSheetState extends State<_EditSheet> {
  late final TextEditingController _controller;

  bool get _isEmail => widget.field == FinishKey.email;

  @override
  void initState() {
    super.initState();
    final home = context.read<AccountCubit>().state.home;
    _controller = TextEditingController(
      text: home?.item(widget.field)?.value ?? '',
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final cubit = context.read<AccountCubit>();
    final saved = _isEmail
        ? await cubit.saveEmail(_controller.text)
        : await cubit.saveName(_controller.text);
    if (saved && mounted) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return BlocBuilder<AccountCubit, AccountState>(
      builder: (context, state) {
        final code = ProblemCode.fromWire(state.fieldError);
        final failure = state.failure;
        final message = state.save != SaveStatus.failed
            ? null
            : code != null
            ? code.message(l10n)
            : failure?.message(l10n);
        return Padding(
          padding: EdgeInsets.fromLTRB(
            20,
            4,
            20,
            20 + MediaQuery.viewInsetsOf(context).bottom,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              FieldFrame(
                label: _isEmail ? l10n.finishEmailField : l10n.finishNameField,
                error: message,
                child: TextField(
                  key: ValueKey('finish:${widget.field.name}'),
                  controller: _controller,
                  autofocus: true,
                  keyboardType: _isEmail
                      ? TextInputType.emailAddress
                      : TextInputType.name,
                  textInputAction: TextInputAction.done,
                  autofillHints: [
                    if (_isEmail) AutofillHints.email else AutofillHints.name,
                  ],
                  style: ShootType.row.copyWith(color: context.colors.ink),
                  decoration: shootFieldDecoration(
                    context,
                    error: message != null,
                  ),
                  onChanged: (_) =>
                      context.read<AccountCubit>().clearFieldError(),
                  onSubmitted: (_) => unawaited(_save()),
                ),
              ),
              const SizedBox(height: ShootSpace.s4),
              TopHit(
                label: l10n.finishSave,
                centered: true,
                loading: state.save == SaveStatus.saving,
                glint: false,
                onPressed: () => unawaited(_save()),
              ),
              const SizedBox(height: ShootSpace.s2),
              SecondaryButton(
                label: l10n.finishCancel,
                onPressed: () => Navigator.of(context).pop(),
              ),
            ],
          ),
        );
      },
    );
  }
}
