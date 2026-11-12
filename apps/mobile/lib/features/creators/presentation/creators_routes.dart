import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/routing/app_routes.dart';
import 'package:shoot_mobile/core/time/clock.dart';
import 'package:shoot_mobile/core/web/share_link.dart';
import 'package:shoot_mobile/core/web/website_links.dart';
import 'package:shoot_mobile/features/creators/domain/entities/creators.dart'
    show CreatorQuery;
import 'package:shoot_mobile/features/creators/presentation/cubit/book_hire_cubits.dart';
import 'package:shoot_mobile/features/creators/presentation/cubit/brief_cubit.dart';
import 'package:shoot_mobile/features/creators/presentation/cubit/directory_cubit.dart';
import 'package:shoot_mobile/features/creators/presentation/cubit/profile_cubit.dart';
import 'package:shoot_mobile/features/creators/presentation/cubit/specialty_cubit.dart';
import 'package:shoot_mobile/features/creators/presentation/pages/book_page.dart';
import 'package:shoot_mobile/features/creators/presentation/pages/directory_page.dart';
import 'package:shoot_mobile/features/creators/presentation/pages/hire_page.dart';
import 'package:shoot_mobile/features/creators/presentation/pages/profile_page.dart';
import 'package:shoot_mobile/features/creators/presentation/pages/specialty_page.dart';

/// The website's paths for this feature (MC FR-067): `/creators` (15), `/creators/:code` (16),
/// `/book/:code` (17), `/work/:specialty` (18) and `/hire/:slug` (19).
///
/// The directory's cubit is kept while the app is open, so its filters and pages are still there
/// when a profile (pushed on top) is closed; a link with filters (`?type=&specialty=&place=`) starts
/// a fresh one. Every other screen makes its cubit when it opens and closes it when it goes.
List<RouteBase> creatorsRoutes({
  required DirectoryCubit Function(CreatorQuery initial) createDirectory,
  required ProfileCubit Function(String code) createProfile,
  required BookCubit Function(String code) createBook,
  required SpecialtyCubit Function(String slug) createSpecialty,
  required HireCubit Function(String slug) createHire,
  required BriefDraft draft,
  required Clock clock,
  required WebsiteLinks links,
  required UrlOpener open,
  ShareLink share = shareWithSystemSheet,
}) {
  final directory = _DirectoryHolder(createDirectory);
  return [
    GoRoute(
      path: AppRoutes.creators,
      builder: (context, state) {
        final cubit = directory.open(state.uri);
        return BlocProvider<DirectoryCubit>.value(
          value: cubit,
          child: DirectoryPage(
            choosing: state.uri.queryParameters['book'] == '1',
          ),
        );
      },
    ),
    GoRoute(
      path: '/creators/:code',
      builder: (context, state) {
        final code = state.pathParameters['code']!;
        return _Scope<ProfileCubit>(
          key: ValueKey('profile:$code'),
          create: () => createProfile(code),
          start: (c) => c.load(),
          child: ProfilePage(links: links, open: open, share: share),
        );
      },
    ),
    GoRoute(
      path: '/book/:code',
      builder: (context, state) {
        final code = state.pathParameters['code']!;
        return _Scope<BookCubit>(
          key: ValueKey('book:$code'),
          create: () => createBook(code),
          start: (c) => c.load(),
          child: BookPage(draft: draft, clock: clock, open: open),
        );
      },
    ),
    GoRoute(
      path: '/work/:specialty',
      builder: (context, state) {
        final slug = state.pathParameters['specialty']!;
        return _Scope<SpecialtyCubit>(
          key: ValueKey('work:$slug'),
          create: () => createSpecialty(slug),
          start: (c) => c.load(),
          child: const SpecialtyRoutePage(),
        );
      },
    ),
    GoRoute(
      path: '/hire/:slug',
      builder: (context, state) {
        final slug = state.pathParameters['slug']!;
        return _Scope<HireCubit>(
          key: ValueKey('hire:$slug'),
          create: () => createHire(slug),
          start: (c) => c.load(),
          child: HireRoutePage(clock: clock, open: open),
        );
      },
    ),
  ];
}

/// Keeps the directory cubit across visits to the screen (MC FR-032).
final class _DirectoryHolder {
  _DirectoryHolder(this._create);

  final DirectoryCubit Function(CreatorQuery initial) _create;
  DirectoryCubit? _cubit;
  String? _lastLink;

  DirectoryCubit open(Uri uri) {
    final q = uri.queryParameters;
    final initial = CreatorQuery(
      type: q['type'],
      specialty: q['specialty'],
      place: q['place'],
    );
    final filtered =
        initial.type != null ||
        initial.specialty != null ||
        initial.place != null;
    final existing = _cubit;
    final link = uri.toString();
    if (existing != null &&
        !existing.isClosed &&
        (!filtered || link == _lastLink)) {
      return existing;
    }
    unawaited(existing?.close());
    _lastLink = link;
    final created = _create(initial);
    unawaited(created.load());
    return _cubit = created;
  }
}

/// Makes a cubit when the screen opens, starts it and closes it when the screen goes.
class _Scope<C extends Cubit<Object?>> extends StatefulWidget {
  const _Scope({
    super.key,
    required this.create,
    required this.start,
    required this.child,
  });

  final C Function() create;
  final void Function(C cubit) start;
  final Widget child;

  @override
  State<_Scope<C>> createState() => _ScopeState<C>();
}

class _ScopeState<C extends Cubit<Object?>> extends State<_Scope<C>> {
  late final C _cubit = widget.create();

  @override
  void initState() {
    super.initState();
    widget.start(_cubit);
  }

  @override
  void dispose() {
    unawaited(_cubit.close());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) =>
      BlocProvider<C>.value(value: _cubit, child: widget.child);
}
