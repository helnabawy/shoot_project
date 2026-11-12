/// One app path, mirrored from the web (`apps/web/src/app/(site)/[locale]/…`) so a shared link opens
/// the same place (contracts/routes.md). A feature makes its route live by building the page and
/// flipping [built] in the same change.
final class AppRoute {
  const AppRoute(
    this.path, {
    required this.owner,
    required this.example,
    this.built = false,
    this.auth = false,
  });

  /// go_router pattern.
  final String path;

  /// The feature that builds it.
  final String owner;

  /// A concrete link for tests.
  final String example;
  final bool built;

  /// Needs a signed-in person (feature 009 adds the guard).
  final bool auth;
}

abstract final class AppRoutes {
  static const home = '/';
  static const creators = '/creators';
  static const accountBookings = '/account/bookings';
  static const gallery = '/_gallery';
  static const welcome = '/welcome/:step';
  static const login = '/login';
  static const loginCode = '/login/code';
  static const register = '/register';
  static const account = '/account';
  static const accountProfile = '/account/profile';

  /// Every path the app knows, built or not (contracts/routes.md).
  static const table = <AppRoute>[
    AppRoute(home, owner: '010', example: '/', built: true),
    AppRoute(welcome, owner: '010', example: '/welcome/1'),
    AppRoute('/menu', owner: '010', example: '/menu'),
    AppRoute(creators, owner: '011', example: '/creators'),
    AppRoute('/creators/:code', owner: '011', example: '/creators/SH-0087'),
    AppRoute('/book/:code', owner: '011', example: '/book/SH-0087'),
    AppRoute('/work/:specialty', owner: '011', example: '/work/weddings'),
    AppRoute(
      '/hire/:slug',
      owner: '011',
      example: '/hire/wedding-photographer-dubai',
    ),
    AppRoute('/match/:ref/:key', owner: '012', example: '/match/B-1/k'),
    AppRoute(
      '/match/:ref/:key/details',
      owner: '012',
      example: '/match/B-1/k/details',
    ),
    AppRoute(
      '/match/:ref/:key/number',
      owner: '012',
      example: '/match/B-1/k/number',
    ),
    AppRoute(
      '/match/:ref/:key/code',
      owner: '012',
      example: '/match/B-1/k/code',
    ),
    AppRoute('/q/:ref/:key', owner: '012', example: '/q/Q-2026-0142/k'),
    AppRoute(login, owner: '009', example: '/login', built: true),
    AppRoute(loginCode, owner: '009', example: '/login/code', built: true),
    AppRoute(register, owner: '009', example: '/register', built: true),
    AppRoute('/account', owner: '013, 014', example: '/account', auth: true),
    AppRoute(
      '/account/finish',
      owner: '013',
      example: '/account/finish',
      auth: true,
    ),
    AppRoute(
      accountBookings,
      owner: '013, 014',
      example: '/account/bookings',
      auth: true,
    ),
    AppRoute(
      '/account/bookings/:ref',
      owner: '013, 014',
      example: '/account/bookings/B-1',
      auth: true,
    ),
    AppRoute(
      '/account/profile',
      owner: '014',
      example: '/account/profile',
      auth: true,
    ),
    AppRoute(
      '/account/availability',
      owner: '014',
      example: '/account/availability',
      auth: true,
    ),
    AppRoute('/guides', owner: '015', example: '/guides'),
    AppRoute('/guides/:slug', owner: '015', example: '/guides/how-to-brief'),
    AppRoute(
      '/guides/category/:slug',
      owner: '015',
      example: '/guides/category/weddings',
    ),
    AppRoute(
      '/guides/author/:slug',
      owner: '015',
      example: '/guides/author/omar',
    ),
    AppRoute('/terms/:slug', owner: '015', example: '/terms/clients'),
    AppRoute(
      '/terms/professional/:slug',
      owner: '015',
      example: '/terms/professional/current',
    ),
    AppRoute('/privacy/:slug', owner: '015', example: '/privacy/current'),
    AppRoute('/:slug', owner: '015', example: '/about'),
    AppRoute(gallery, owner: '007', example: '/_gallery', built: true),
  ];
}
