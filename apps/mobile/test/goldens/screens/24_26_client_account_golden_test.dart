// The plan names screen goldens by board number (`<id>_<name>_golden_test.dart`).
// ignore_for_file: file_names
@Tags(['golden'])
library;

import 'package:flutter/widgets.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/l10n/locale_cubit.dart';
import 'package:shoot_mobile/features/account/domain/entities/account.dart';
import 'package:shoot_mobile/features/account/presentation/pages/account_home_page.dart';
import 'package:shoot_mobile/features/account/presentation/pages/bookings_page.dart';
import 'package:shoot_mobile/features/account/presentation/pages/finish_page.dart';

import '../../helpers/account_harness.dart';
import '../../helpers/golden.dart';
import '../../helpers/in_memory_preferences_store.dart';

String _t(bool arabic, String en, String ar) => arabic ? ar : en;

/// The boards' own content (S07a, S07b, S07-bookings) as server data.
BookingSummary _booking({
  required String reference,
  required BookingStatus status,
  required String occasion,
  required String place,
  required DateTime date,
  String? startTime,
  String? professional,
  int? totalFils,
}) => BookingSummary(
  reference: reference,
  status: status,
  occasion: occasion,
  place: place,
  date: date,
  startTime: startTime,
  professional: professional,
  totalFils: totalFils,
);

BookingSummary _wedding(bool arabic, {String? startTime}) => _booking(
  reference: 'Q-2026-0142',
  status: BookingStatus.awaitingPayment,
  occasion: _t(arabic, 'Wedding', 'زفاف'),
  place: _t(arabic, 'Dubai', 'دبي'),
  date: DateTime(2024, 12, 14),
  startTime: startTime,
  professional: _t(arabic, 'Omar K.', 'عمر ك.'),
  totalFils: 95000,
);

AccountHome _home(bool arabic) => AccountHome(
  name: _t(arabic, 'Hosam', 'حسام'),
  phone: '+971501234567',
  upNext: UpNext(kind: UpNextKind.quote, booking: _wedding(arabic)),
  bookingsWaiting: 1,
  bookingsOpen: 2,
  briefsOpen: 1,
  briefs: [
    BriefSummary(
      reference: 'B-2026-0311',
      sentence: _t(
        arabic,
        'Photographer for a wedding in Dubai',
        'مصور لحفل زفاف في دبي',
      ),
      sentAt: DateTime(2026, 11, 9, 10),
      status: BriefStatus.contacted,
      bookingReference: 'Q-2026-0142',
    ),
  ],
  finishItems: [
    const FinishItem(key: FinishKey.number, done: true, value: '+971501234567'),
    FinishItem(
      key: FinishKey.name,
      done: true,
      value: _t(arabic, 'Hosam', 'حسام'),
    ),
    const FinishItem(key: FinishKey.email, done: false),
  ],
  finishAutoOpen: false,
  about: [
    _t(
      arabic,
      'Keeps every booking, quote and chat link in one place',
      'كل حجز وعرض سعر ورابط محادثة في مكان واحد',
    ),
    _t(
      arabic,
      'Your number stays private; creators see your name only',
      'رقمك يبقى خاصًا؛ المبدعون يرون اسمك فقط',
    ),
    _t(
      arabic,
      'Next time, your brief is one tap: same details, new date',
      'في المرة القادمة طلبك بلمسة واحدة: التفاصيل نفسها، موعد جديد',
    ),
  ],
);

BookingList _bookings(bool arabic) => BookingList(
  upcoming: [
    _wedding(arabic, startTime: '16:00'),
    _booking(
      reference: 'Q-2026-0150',
      status: BookingStatus.scheduled,
      occasion: _t(arabic, 'Family portraits', 'صور عائلية'),
      place: _t(arabic, 'Sharjah', 'الشارقة'),
      date: DateTime(2025, 1, 9),
      startTime: '09:00',
      professional: _t(arabic, 'Mariam A.', 'مريم أ.'),
      totalFils: 120000,
    ),
  ],
  past: [
    _booking(
      reference: 'Q-2026-0098',
      status: BookingStatus.paid,
      occasion: _t(arabic, 'Product shoot', 'تصوير منتجات'),
      place: _t(arabic, 'Dubai', 'دبي'),
      date: DateTime(2025, 10, 2),
      professional: _t(arabic, 'Noor H.', 'نور ح.'),
      totalFils: 160000,
    ),
    _booking(
      reference: 'Q-2026-0077',
      status: BookingStatus.cancelled,
      occasion: _t(arabic, 'Birthday', 'عيد ميلاد'),
      place: _t(arabic, 'Ajman', 'عجمان'),
      date: DateTime(2025, 9, 6),
      professional: _t(arabic, 'Yusuf R.', 'يوسف ر.'),
    ),
  ],
  page: 1,
  hasMore: false,
);

/// The account cubits over the board's data. The device's language and theme are not chosen
/// (the board's "2 of 4" and "English · auto"), so the shell's chosen locale is hidden from the
/// screen's own reading of it.
Widget _screen(Variant variant, Widget page) {
  final arabic = variant.locale.languageCode == 'ar';
  final repository = FakeAccountRepository(
    home: _home(arabic),
    bookings: _bookings(arabic),
  );
  return MultiBlocProvider(
    providers: [
      BlocProvider(create: (_) => LocaleCubit(InMemoryPreferencesStore())),
      BlocProvider(create: (_) => accountCubit(repository)),
      BlocProvider(create: (_) => bookingsCubit(repository)),
    ],
    child: page,
  );
}

final _screens = <(String, String, Widget)>[
  ('24', 'my account', const AccountHomePage()),
  ('25', 'finish your account', const FinishPage()),
  ('26', 'your bookings', const BookingsPage()),
];

void main() {
  for (final (id, name, page) in _screens) {
    for (final variant in Variant.values) {
      testWidgets(
        'MK screen $id ($name) renders to its board in ${variant.id}',
        (tester) => pumpBoard(
          tester,
          id: id,
          variant: variant,
          child: _screen(variant, page),
        ),
        skip: !goldensEnabled,
      );
    }

    testWidgets(
      'screen $id self-baselines: no overflow at 393, 430, iPad and text scale 2',
      (tester) => pumpSelfBaselines(
        tester,
        id: id,
        child: _screen(Variant.enLight, page),
      ),
      skip: !goldensEnabled,
    );
  }
}
