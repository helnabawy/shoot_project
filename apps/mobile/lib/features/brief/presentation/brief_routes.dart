import 'dart:async';

import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/routing/app_routes.dart';
import 'package:shoot_mobile/features/brief/presentation/brief_cubit.dart';

/// Where a signed-out person goes when they send a brief (021): the sign-in screens, which end on
/// `/brief/send`, as on the website.
final briefSignInPath =
    '${AppRoutes.login}?next=${Uri.encodeComponent(AppRoutes.briefSend)}&for=brief';

/// `/brief/send` (021, BS-US4-S2): sign-in from the brief ends here. The kept draft is sent (once,
/// and only when the brief asked for sign-in) and the landing shows, where the receipt opens Quick
/// Match. Reaching it any other way just shows the landing.
GoRoute briefSendRoute(BriefCubit brief) => GoRoute(
  path: AppRoutes.briefSend,
  redirect: (context, state) {
    unawaited(brief.sendAfterSignIn());
    return AppRoutes.home;
  },
);
