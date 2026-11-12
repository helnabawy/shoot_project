import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/web/website_links.dart';
import 'package:shoot_mobile/features/quick_match/presentation/cubit/book_flow_cubit.dart';
import 'package:shoot_mobile/features/quick_match/presentation/cubit/booking_view_cubit.dart';
import 'package:shoot_mobile/features/quick_match/presentation/cubit/match_cubit.dart';
import 'package:shoot_mobile/features/quick_match/presentation/pages/booking_page.dart';
import 'package:shoot_mobile/features/quick_match/presentation/pages/details_page.dart';
import 'package:shoot_mobile/features/quick_match/presentation/pages/match_page.dart';
import 'package:shoot_mobile/features/quick_match/presentation/pages/number_code_pages.dart';

/// The two cubits that live while one brief is being booked: step 2's choices and steps 3 and 4's
/// details and sign-in. They are kept for the brief's private link until another brief is opened,
/// so going back and forward between the screens keeps what the person chose (FR-046; details are
/// kept only while the app is open).
final class QuickMatchFlow {
  QuickMatchFlow({required this.match, required this.book});

  final MatchCubit match;
  final BookFlowCubit book;

  /// A deep link to 09, 10 or 11 has no step 2 behind it: load it, and carry the brief's choices
  /// over so the person can carry on.
  Future<void> prime() async {
    if (book.state.picks.isNotEmpty) return;
    if (match.state.page == null) await match.load();
    final page = match.state.page;
    final picks = match.state.picks;
    if (page == null || picks == null) return;
    book.begin(
      picks: picks,
      date: match.state.date ?? page.date ?? page.briefDate ?? '',
      duration: page.duration ?? '',
    );
  }

  Future<void> close() async {
    await match.close();
    await book.close();
  }
}

final class QuickMatchFlows {
  QuickMatchFlows(this._create);

  final QuickMatchFlow Function(String ref, String key) _create;
  String? _id;
  QuickMatchFlow? _current;

  QuickMatchFlow open(String ref, String key) {
    final id = '$ref/$key';
    if (_id == id && _current != null) return _current!;
    final old = _current;
    if (old != null) unawaited(old.close());
    _id = id;
    return _current = _create(ref, key);
  }
}

/// `/match/{ref}/{key}` (07, 08), `/details` (09), `/number` (10), `/code` (11) and `/q/{ref}/{key}`
/// (12, 13, 14, 40), at the website's paths. `/ar` links are handled by the router.
List<RouteBase> quickMatchRoutes({
  required QuickMatchFlows flows,
  required BookingViewCubit Function(String ref, String key) createBooking,
  required WebsiteLinks links,
  UrlOpener openUrl = openInBrowser,
}) {
  Widget scoped(
    GoRouterState state,
    Widget Function(String ref, String key) page, {
    bool prime = false,
  }) {
    final ref = state.pathParameters['ref']!;
    final key = state.pathParameters['key']!;
    final flow = flows.open(ref, key);
    if (prime) unawaited(flow.prime());
    return MultiBlocProvider(
      providers: [
        BlocProvider<MatchCubit>.value(value: flow.match),
        BlocProvider<BookFlowCubit>.value(value: flow.book),
      ],
      child: page(ref, key),
    );
  }

  return [
    GoRoute(
      path: '/match/:ref/:key',
      builder: (context, state) => scoped(
        state,
        (ref, key) => MatchScreen(ref: ref, accessKey: key, openUrl: openUrl),
      ),
      routes: [
        GoRoute(
          path: 'details',
          builder: (context, state) => scoped(
            state,
            prime: true,
            (ref, key) =>
                DetailsPage(ref: ref, accessKey: key, openUrl: openUrl),
          ),
        ),
        GoRoute(
          path: 'number',
          builder: (context, state) => scoped(
            state,
            prime: true,
            (ref, key) =>
                QmNumberPage(ref: ref, accessKey: key, openUrl: openUrl),
          ),
        ),
        GoRoute(
          path: 'code',
          builder: (context, state) => scoped(
            state,
            prime: true,
            (ref, key) =>
                QmCodePage(ref: ref, accessKey: key, openUrl: openUrl),
          ),
        ),
      ],
    ),
    GoRoute(
      path: '/q/:ref/:key',
      builder: (context, state) {
        final ref = state.pathParameters['ref']!;
        final key = state.pathParameters['key']!;
        return _BookingScope(
          // A new quotation (or a refresh by a new link) is a new screen.
          key: ValueKey('q:$ref/$key'),
          create: () => createBooking(ref, key),
          child: BookingPage(
            ref: ref,
            accessKey: key,
            links: links,
            openUrl: openUrl,
          ),
        );
      },
    ),
  ];
}

class _BookingScope extends StatefulWidget {
  const _BookingScope({super.key, required this.create, required this.child});

  final BookingViewCubit Function() create;
  final Widget child;

  @override
  State<_BookingScope> createState() => _BookingScopeState();
}

class _BookingScopeState extends State<_BookingScope> {
  late final BookingViewCubit _cubit = widget.create();

  @override
  void dispose() {
    unawaited(_cubit.close());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) =>
      BlocProvider<BookingViewCubit>.value(value: _cubit, child: widget.child);
}
