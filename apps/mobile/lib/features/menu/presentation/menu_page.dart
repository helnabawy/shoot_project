import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/auth/session_cubit.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/l10n/app_locales.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/l10n/locale_cubit.dart';
import 'package:shoot_mobile/core/routing/app_router.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/theme/theme_mode_cubit.dart';
import 'package:shoot_mobile/core/web/website_links.dart';
import 'package:shoot_mobile/core/web/whatsapp_link.dart';
import 'package:shoot_mobile/core/widgets/appearance_sheet.dart';
import 'package:shoot_mobile/core/widgets/group_label.dart';
import 'package:shoot_mobile/core/widgets/icon_tile.dart';
import 'package:shoot_mobile/core/widgets/secondary_button.dart';
import 'package:shoot_mobile/core/widgets/segmented_control.dart';
import 'package:shoot_mobile/core/widgets/shoot_header.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon_button.dart';
import 'package:shoot_mobile/core/widgets/shoot_row.dart';
import 'package:shoot_mobile/core/widgets/shoot_scaffold.dart';
import 'package:shoot_mobile/core/widgets/top_hit.dart';
import 'package:shoot_mobile/core/widgets/wordmark.dart';
import 'package:shoot_mobile/features/brief/presentation/brief_cubit.dart';
import 'package:shoot_mobile/features/site/domain/entities/site_info.dart';

typedef SiteLoader = Future<Result<SiteInfo>> Function();

/// Screen 06, built to board `S01m-menu`: the one place for the rest of the app. "Start a brief" is
/// its one primary action; the groups follow FR-040. Opened with `push`, so closing it (or the
/// system back gesture) returns to the screen it came from unchanged (FR-045). Destinations whose
/// feature is not built are not registered routes, so they show screen 37 (FR-047).
class MenuPage extends StatefulWidget {
  const MenuPage({
    super.key,
    required this.loadSite,
    required this.links,
    this.open = openInBrowser,
    this.onStartBrief,
  });

  /// Site settings, for the WhatsApp number and default message.
  final SiteLoader loadSite;
  final WebsiteLinks links;

  /// Opens an address outside the app (WhatsApp); injectable for tests.
  final UrlOpener open;

  /// Opens the landing's brief at its first unanswered step; defaults to the app's [BriefCubit].
  final VoidCallback? onStartBrief;

  @override
  State<MenuPage> createState() => _MenuPageState();
}

class _MenuPageState extends State<MenuPage> {
  SiteInfo? _site;

  @override
  void initState() {
    super.initState();
    unawaited(_load());
  }

  Future<void> _load() async {
    final result = await widget.loadSite();
    if (!mounted) return;
    if (result case Ok(:final value)) setState(() => _site = value);
  }

  void _close() {
    if (context.canPop()) {
      context.pop();
    } else {
      context.go(AppRoutes.home);
    }
  }

  void _startBrief() {
    (widget.onStartBrief ?? context.read<BriefCubit>().openFirstUnanswered)();
    context.go(AppRoutes.home);
  }

  Future<void> _whatsapp() async {
    final number = _site?.whatsapp.number;
    if (number == null) return;
    final message = _site?.whatsapp.defaultMessage;
    final opened = await widget.open(
      WhatsappLink.native(number, message: message),
    );
    if (!opened) await widget.open(WhatsappLink.web(number, message: message));
  }

  void _logOut() {
    final router = GoRouter.of(context);
    unawaited(
      context.read<SessionCubit>().signOut().then(
        (_) => router.go(AppRoutes.home),
      ),
    );
  }

  String get _lang => Localizations.localeOf(context).languageCode;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    final session = context.watch<SessionCubit>().state;
    final theme = context.watch<ThemeModeCubit>().state;
    final arabic = _lang == 'ar';
    final hasWhatsapp = _site?.whatsapp.number != null;
    final meta = ShootType.meta.copyWith(color: c.mute, height: 1.9);

    Widget row(
      ShootIcons icon,
      String label,
      VoidCallback onTap, {
      String? hint,
      RowDivider divider = RowDivider.top,
    }) {
      // At large text sizes the quiet hint joins the label so nothing is cut off.
      final large = MediaQuery.textScalerOf(context).scale(16) > 22;
      return ShootRow(
        label: hint != null && large ? '$label $hint' : label,
        onTap: onTap,
        divider: divider,
        leading: IconTile(icon),
        trailing: hint == null || large
            ? null
            : Text(hint, style: ShootType.meta.copyWith(color: c.mute)),
      );
    }

    final user = session is SignedIn ? session.session.user : null;

    return ShootScaffold(
      child: Column(
        children: [
          ShootHeader(
            leading: Wordmark(label: l10n.appTitle, onTap: _close),
            trailing: [
              ShootIconButton(
                icon: ShootIcons.close,
                label: l10n.mlCloseMenu,
                onPressed: _close,
              ),
            ],
          ),
          Expanded(
            child: CustomScrollView(
              slivers: [
                SliverFillRemaining(
                  hasScrollBody: false,
                  child: Padding(
                    padding: const EdgeInsetsDirectional.fromSTEB(12, 8, 12, 0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        TopHit(
                          label: l10n.mlStartBrief,
                          chevron: true,
                          onPressed: _startBrief,
                        ),
                        const SizedBox(height: 18),
                        _Section(
                          label: l10n.mlMenuBrowse,
                          children: [
                            row(
                              ShootIcons.creators,
                              l10n.mlMenuCreators,
                              () => context.push(AppRoutes.creators),
                            ),
                            row(
                              ShootIcons.guides,
                              l10n.mlMenuGuides,
                              () => context.push('/guides'),
                            ),
                            row(
                              ShootIcons.lines,
                              l10n.mlMenuHowItWorks,
                              () => context.push('/how-it-works'),
                              divider: RowDivider.topAndBottom,
                            ),
                          ],
                        ),
                        const SizedBox(height: 18),
                        _Section(
                          label: l10n.mlMenuYou,
                          children: [
                            if (user != null) ...[
                              row(
                                ShootIcons.person,
                                l10n.mlMenuAccount,
                                () => context.push(afterSignIn(user)),
                                hint: user.name,
                              ),
                              KeyedSubtree(
                                key: const ValueKey('menu:bookings'),
                                child: row(
                                  ShootIcons.calendar,
                                  l10n.mlMenuBookings,
                                  () => context.push(AppRoutes.accountBookings),
                                ),
                              ),
                              ShootRow(
                                key: const ValueKey('menu:logOut'),
                                label: l10n.accountLogOut,
                                onTap: _logOut,
                                chevron: false,
                                divider: RowDivider.topAndBottom,
                                leading: const IconTile(ShootIcons.logOut),
                              ),
                            ] else ...[
                              row(
                                ShootIcons.person,
                                l10n.mlMenuLogIn,
                                () => context.push(AppRoutes.login),
                                hint: l10n.mlMenuLogInHint,
                              ),
                              row(
                                ShootIcons.camera,
                                l10n.mlMenuJoin,
                                () => context.push(AppRoutes.register),
                                divider: RowDivider.topAndBottom,
                              ),
                            ],
                          ],
                        ),
                        const SizedBox(height: 18),
                        Padding(
                          padding: const EdgeInsetsDirectional.symmetric(
                            horizontal: 8,
                          ),
                          child: Column(
                            children: [
                              _Setting(
                                label: l10n.mlMenuLanguage,
                                child: SegmentedControl<bool>(
                                  segments: const [
                                    (false, 'English'),
                                    (true, 'عربي'),
                                  ],
                                  selected: arabic,
                                  onChanged: (toArabic) =>
                                      context.read<LocaleCubit>().select(
                                        toArabic
                                            ? AppLocales.arabic
                                            : AppLocales.english,
                                      ),
                                ),
                              ),
                              const SizedBox(height: 8),
                              _Setting(
                                label: l10n.mlMenuTheme,
                                child: SegmentedControl<ThemeMode>(
                                  segments: [
                                    (ThemeMode.light, l10n.themeLight),
                                    (ThemeMode.dark, l10n.themeDark),
                                    (ThemeMode.system, l10n.mlThemeAuto),
                                  ],
                                  selected: theme,
                                  onChanged: context
                                      .read<ThemeModeCubit>()
                                      .select,
                                ),
                              ),
                              const SizedBox(height: 8),
                              _Setting(
                                label: l10n.appearanceTitle,
                                child: _AccentButton(
                                  key: const Key('menu-accent-button'),
                                  onTap: () =>
                                      unawaited(showAppearanceSheet(context)),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const Spacer(),
                        Padding(
                          padding: const EdgeInsetsDirectional.fromSTEB(
                            8,
                            16,
                            8,
                            16,
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              if (hasWhatsapp)
                                SecondaryButton(
                                  label: l10n.mlMenuWhatsapp,
                                  icon: ShootIcons.whatsapp,
                                  onPressed: () => unawaited(_whatsapp()),
                                ),
                              const SizedBox(height: 10),
                              Text.rich(
                                TextSpan(
                                  children: [
                                    _link(
                                      l10n.mlMenuTerms,
                                      () => widget.links.terms(_lang),
                                    ),
                                    const TextSpan(text: ' · '),
                                    _link(
                                      l10n.mlMenuProfessionalTerms,
                                      () =>
                                          widget.links.professionalTerms(_lang),
                                    ),
                                    const TextSpan(text: ' · '),
                                    _link(
                                      l10n.mlMenuPrivacy,
                                      () => widget.links.privacy(_lang),
                                    ),
                                  ],
                                ),
                                textAlign: TextAlign.center,
                                style: meta,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  InlineSpan _link(String text, Future<bool> Function() open) {
    return WidgetSpan(
      alignment: PlaceholderAlignment.baseline,
      baseline: TextBaseline.alphabetic,
      child: _MenuLink(text: text, onTap: () => unawaited(open())),
    );
  }
}

/// A text link with a 44 px tall touch target that reads as part of the line.
class _MenuLink extends StatelessWidget {
  const _MenuLink({required this.text, required this.onTap});

  final String text;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      link: true,
      label: text,
      onTap: onTap,
      excludeSemantics: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: Text(
          text,
          style: ShootType.meta.copyWith(
            color: context.colors.accentInk,
            height: 1.9,
          ),
        ),
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.label, required this.children});

  final String label;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsetsDirectional.symmetric(horizontal: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          GroupLabel(label, padding: const EdgeInsets.only(bottom: 6)),
          ...children,
        ],
      ),
    );
  }
}

/// Shows the current accent as a dot and opens the Appearance sheet, where
/// the accent (and theme) are chosen.
class _AccentButton extends StatelessWidget {
  const _AccentButton({super.key, required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      button: true,
      label: context.l10n.appearanceButtonTooltip,
      excludeSemantics: true,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(ShootRadius.row),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 44),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              Container(
                width: 22,
                height: 22,
                decoration: BoxDecoration(
                  color: c.accent,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: ShootSpace.s2),
              ShootIcon(ShootIcons.chevron, size: 18, color: c.mute),
            ],
          ),
        ),
      ),
    );
  }
}

class _Setting extends StatelessWidget {
  const _Setting({required this.label, required this.child});

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final text = Text(
      label,
      style: ShootType.chip.copyWith(color: context.colors.ink),
    );
    // At large text sizes the control moves under its label and takes the full width.
    if (MediaQuery.textScalerOf(context).scale(15) > 21) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [text, const SizedBox(height: 6), child],
      );
    }
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        text,
        const SizedBox(width: ShootSpace.s3),
        SizedBox(width: 190, child: child),
      ],
    );
  }
}
