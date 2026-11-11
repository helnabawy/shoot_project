import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/l10n/bidi.dart';
import 'package:shoot_mobile/core/motion/ambient_pause.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/widgets/calendar_month.dart';
import 'package:shoot_mobile/core/widgets/choice_chip.dart';
import 'package:shoot_mobile/core/widgets/creator_card.dart';
import 'package:shoot_mobile/core/widgets/empty_state.dart';
import 'package:shoot_mobile/core/widgets/golden_hour_scene.dart';
import 'package:shoot_mobile/core/widgets/group_label.dart';
import 'package:shoot_mobile/core/widgets/icon_tile.dart';
import 'package:shoot_mobile/core/widgets/message_banner.dart';
import 'package:shoot_mobile/core/widgets/money.dart';
import 'package:shoot_mobile/core/widgets/otp_code_input.dart';
import 'package:shoot_mobile/core/widgets/phone_field.dart';
import 'package:shoot_mobile/core/widgets/photo_tile.dart';
import 'package:shoot_mobile/core/widgets/picker_field.dart';
import 'package:shoot_mobile/core/widgets/progress_bar.dart';
import 'package:shoot_mobile/core/widgets/quote_lines.dart';
import 'package:shoot_mobile/core/widgets/rich_content.dart';
import 'package:shoot_mobile/core/widgets/scene_tile.dart';
import 'package:shoot_mobile/core/widgets/secondary_button.dart';
import 'package:shoot_mobile/core/widgets/segmented_control.dart';
import 'package:shoot_mobile/core/widgets/shoot_field.dart';
import 'package:shoot_mobile/core/widgets/shoot_header.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon_button.dart';
import 'package:shoot_mobile/core/widgets/shoot_panel.dart';
import 'package:shoot_mobile/core/widgets/shoot_row.dart';
import 'package:shoot_mobile/core/widgets/shoot_scaffold.dart';
import 'package:shoot_mobile/core/widgets/snap_carousel.dart';
import 'package:shoot_mobile/core/widgets/status_badge.dart';
import 'package:shoot_mobile/core/widgets/step_strip.dart';
import 'package:shoot_mobile/core/widgets/summary_row.dart';
import 'package:shoot_mobile/core/widgets/text_link.dart';
import 'package:shoot_mobile/core/widgets/top_hit.dart';
import 'package:shoot_mobile/core/widgets/wordmark.dart';

/// One catalogue component (contracts/component-catalogue.md) with each of its named states, built
/// from placeholder data. The gallery shows them; the RTL, large-text, semantics and component
/// golden tests walk them. Debug and tests only: the placeholder text here is never product copy.
final class CatalogueEntry {
  const CatalogueEntry(
    this.name,
    this.states, {
    this.alwaysLtr = false,
    this.animates = false,
    this.mirrors = true,
  });

  final String name;
  final Map<String, WidgetBuilder> states;

  /// Digits and prices stay left to right in Arabic, so these are not mirrored.
  final bool alwaysLtr;

  /// Contains a looping or indefinite animation (a spinner, an ambient loop).
  final bool animates;

  /// Lays out as a mirror image in Arabic. The calendar does not: its week starts on the locale's
  /// first day (Saturday in Arabic), so days move as well as mirror.
  final bool mirrors;
}

void _none() {}

/// The whole catalogue, in the contract's order.
final List<CatalogueEntry> catalogue = [
  CatalogueEntry('ShootHeader', {
    'wordmark and an action': (_) => const ShootHeader(
      key: ValueKey('gallery:header'),
      leading: Wordmark(label: 'Shoot'),
      trailing: [
        ShootIconButton(
          icon: ShootIcons.person,
          label: 'Account',
          onPressed: _none,
        ),
      ],
    ),
    'back': (_) => const ShootHeader(
      key: ValueKey('gallery:header-back'),
      leadsWithBack: true,
      leading: ShootIconButton(
        icon: ShootIcons.back,
        label: 'Back',
        onPressed: _none,
      ),
    ),
  }),
  CatalogueEntry('Wordmark', {
    'link': (_) => const Wordmark(label: 'Shoot', onTap: _none),
  }),
  CatalogueEntry('ShootIconButton', {
    'enabled': (_) => const ShootIconButton(
      icon: ShootIcons.back,
      label: 'Back',
      onPressed: _none,
    ),
    'disabled': (_) => const ShootIconButton(
      icon: ShootIcons.back,
      label: 'Back',
      onPressed: null,
    ),
    'text action': (_) => const ShootTextAction(
      text: 'عربي',
      label: 'Switch to Arabic',
      onPressed: _none,
    ),
  }),
  CatalogueEntry('TopHit', {
    'centred': (_) => const TopHit(
      key: ValueKey('g:th1'),
      label: 'Start a brief',
      onPressed: _none,
      centered: true,
    ),
    'with price': (_) => const TopHit(
      key: ValueKey('g:th2'),
      label: 'Book Omar',
      onPressed: _none,
      leading: ShootIcons.calendar,
      price: 'AED 950',
      chevron: true,
    ),
    'disabled': (_) => const TopHit(
      key: ValueKey('g:th3'),
      label: 'Continue',
      onPressed: null,
    ),
  }),
  CatalogueEntry('TopHit loading', {
    'loading': (_) => const TopHit(
      key: ValueKey('g:th4'),
      label: 'Sending',
      onPressed: _none,
      loading: true,
    ),
  }, animates: true),
  CatalogueEntry('SecondaryButton', {
    'enabled': (_) => const SecondaryButton(
      label: 'Change date',
      onPressed: _none,
      icon: ShootIcons.calendar,
    ),
    'disabled': (_) =>
        const SecondaryButton(label: 'Change date', onPressed: null),
  }),
  CatalogueEntry('TextLink', {
    'link': (_) => const TextLink(label: 'Change number', onTap: _none),
  }),
  CatalogueEntry('ShootPanel', {
    'panel': (_) => const ShootPanel(
      padding: EdgeInsets.all(8),
      child: SummaryRow(
        label: 'Sat 14 Dec, 16:00',
        value: '4 h',
        leading: IconTile(ShootIcons.calendar),
      ),
    ),
  }),
  CatalogueEntry('FloatingPanel', {
    'bar': (_) => const FloatingPanel(
      padding: EdgeInsets.all(8),
      child: ShootRow(
        label: 'Weddings',
        leading: IconTile(ShootIcons.person),
        onTap: _none,
      ),
    ),
  }),
  CatalogueEntry('ShootSheet', {
    'sheet': (_) => const ShootSheet(
      label: 'Choose a time',
      child: Padding(padding: EdgeInsets.all(16), child: GroupLabel('Morning')),
    ),
  }),
  CatalogueEntry('GroupLabel', {
    'label': (_) => const GroupLabel('Your creators'),
  }),
  CatalogueEntry('ShootRow', {
    'link': (_) => const ShootRow(
      label: 'Browse creators',
      leading: IconTile(ShootIcons.person),
      onTap: _none,
    ),
    'option list, one selected': (_) => const Column(
      children: [
        ShootRow(
          label: 'Portraits',
          leading: IconTile(ShootIcons.person),
          minHeight: 44,
          padding: EdgeInsetsDirectional.symmetric(horizontal: 8, vertical: 7),
          onTap: _none,
        ),
        ShootRow(
          label: 'Weddings',
          leading: IconTile(ShootIcons.calendar),
          minHeight: 44,
          padding: EdgeInsetsDirectional.symmetric(horizontal: 8, vertical: 7),
          selected: true,
          onTap: _none,
        ),
      ],
    ),
  }),
  CatalogueEntry('SummaryRow', {
    'with value': (_) => const SummaryRow(
      label: 'Edited photos',
      value: '150',
      leading: IconTile(ShootIcons.calendar),
    ),
  }),
  CatalogueEntry('IconTile', {
    'sizes': (_) => const Row(
      spacing: ShootSpace.s3,
      children: [
        IconTile(ShootIcons.person),
        IconTile.large(ShootIcons.searchQuestion),
        IconTile.big(ShootIcons.alert),
      ],
    ),
  }),
  CatalogueEntry('PhotoTile', {
    'no photo yet': (_) => const Row(
      spacing: ShootSpace.s3,
      children: [PhotoTile(), PhotoTile(variant: 1), PhotoTile(variant: 2)],
    ),
  }),
  CatalogueEntry('ShootField', {
    'empty': (_) => const ShootField(label: 'Your name', hint: 'As on your ID'),
    'error': (_) =>
        const ShootField(label: 'Email', error: 'Check the address'),
    'disabled': (_) => const ShootField(label: 'Your name', enabled: false),
  }),
  CatalogueEntry('ShootTextArea', {
    'empty': (_) => const ShootTextArea(label: 'Anything else?'),
  }),
  CatalogueEntry('PickerField', {
    'chosen': (_) => const PickerField(
      label: 'Emirate',
      value: 'Dubai',
      onTap: _none,
      opensHint: 'opens a list',
    ),
    'empty': (_) => const PickerField(
      label: 'Emirate',
      placeholder: 'Choose',
      onTap: _none,
      opensHint: 'opens a list',
    ),
  }),
  CatalogueEntry('ShootChip', {
    'group': (_) => const ChipGroup(
      children: [
        ShootChip(label: 'Weddings', on: true, onTap: _none),
        ShootChip(label: 'Portraits', on: false, onTap: _none),
        ShootChip(label: 'Products', on: false, onTap: _none),
      ],
    ),
  }),
  CatalogueEntry('SegmentedControl', {
    'two': (_) => SegmentedControl<int>(
      segments: const [(0, 'Photos'), (1, 'Video')],
      selected: 0,
      onChanged: (_) {},
    ),
  }),
  CatalogueEntry('PhoneField', {
    'empty': (_) => const PhoneField(
      label: 'Mobile number',
      countryCode: '+971',
      countryCodeLabel: 'Country code, United Arab Emirates, +971',
    ),
  }, alwaysLtr: true),
  CatalogueEntry('OtpCodeInput', {
    'empty': (_) => OtpCodeInput(label: '6-digit code', onCompleted: (_) {}),
    'error': (_) =>
        OtpCodeInput(label: '6-digit code', onCompleted: (_) {}, errorCount: 1),
  }, alwaysLtr: true),
  CatalogueEntry('StatusBadge', {
    for (final tone in BadgeTone.values)
      tone.name: (_) => StatusBadge(label: 'Awaiting payment', tone: tone),
  }),
  CatalogueEntry('Money', {
    'price': (_) => const Money(amount: 950),
  }, alwaysLtr: true),
  CatalogueEntry('QuoteLines', {
    'quotation': (_) => const QuoteLines(
      lines: [
        (label: 'Wedding coverage', detail: '4 hours, Dubai', amount: 700),
        (
          label: 'Edited photos',
          detail: '150 images, within 7 days',
          amount: 250,
        ),
      ],
      totalLabel: 'Total',
      total: 950,
      totalNote: 'VAT not applicable',
    ),
  }),
  CatalogueEntry('ProgressBar', {
    '60 %': (_) => const ProgressBar(value: .6, label: 'Profile complete'),
  }),
  CatalogueEntry('StepStrip', {
    'three tabs': (_) => StepStrip(
      tabs: const [
        (label: 'Details', state: 'Done', tone: StepTone.done),
        (label: 'Samples', state: 'Add 3 more', tone: StepTone.attention),
        (label: 'Payout', state: null, tone: StepTone.neutral),
      ],
      selected: 1,
      onSelect: (_) {},
    ),
    'selected without a state line': (_) => StepStrip(
      tabs: const [
        (label: 'Details', state: 'Done', tone: StepTone.done),
        (label: 'Payout', state: null, tone: StepTone.neutral),
      ],
      selected: 1,
      onSelect: (_) {},
    ),
  }),
  CatalogueEntry('MessageBanner', {
    'attention': (_) => const MessageBanner(
      text: 'Pay by Friday to keep the date.',
      tone: BannerTone.attention,
    ),
    'error': (_) => const MessageBanner(
      text: 'That code is wrong. You have two tries left.',
      tone: BannerTone.error,
    ),
  }),
  CatalogueEntry('CalendarMonth', {
    'today free': (_) => CalendarMonth(
      month: DateTime(2026, 12),
      today: DateTime(2026, 12, 9),
      stateOf: (d) => d.day == 14
          ? DayState.booked
          : d.day >= 20 && d.day <= 22
          ? DayState.blocked
          : DayState.free,
      dayLabel: (d, s) => '${d.day} December, ${s.name}',
      onDayTap: (_) {},
    ),
    'today booked': (_) => CalendarMonth(
      month: DateTime(2026, 12),
      today: DateTime(2026, 12, 14),
      stateOf: (d) => d.day == 14
          ? DayState.booked
          : d.day >= 20 && d.day <= 22
          ? DayState.blocked
          : DayState.free,
      dayLabel: (d, s) => '${d.day} December, ${s.name}',
      onDayTap: (_) {},
    ),
  }, mirrors: false),
  CatalogueEntry('CreatorCard', {
    'chosen': (_) => CreatorCard(
      label: 'Omar K., wedding photographer, AED 950',
      chosen: true,
      onTap: _none,
      children: [
        const SizedBox(height: 120, child: SceneTile()),
        Builder(builder: (context) => Text(isolate(context, 'Omar K.'))),
      ],
    ),
    'not chosen': (_) => CreatorCard(
      label: 'Sara M., wedding photographer, AED 1,100',
      onTap: _none,
      children: [
        const SizedBox(height: 120, child: SceneTile(variant: 1)),
        Builder(builder: (context) => Text(isolate(context, 'Sara M.'))),
      ],
    ),
  }),
  CatalogueEntry('SnapCarousel', {
    'three cards': (_) => SnapCarousel(
      height: 60,
      positionLabel: (n, m) => '${n + 1} of $m',
      children: [
        CreatorCard(
          label: 'Omar K.',
          onTap: _none,
          chosen: true,
          children: [
            Builder(builder: (context) => Text(isolate(context, 'Omar K.'))),
          ],
        ),
        CreatorCard(
          label: 'Sara M.',
          onTap: _none,
          children: [
            Builder(builder: (context) => Text(isolate(context, 'Sara M.'))),
          ],
        ),
        CreatorCard(
          label: 'Lina R.',
          onTap: _none,
          children: [
            Builder(builder: (context) => Text(isolate(context, 'Lina R.'))),
          ],
        ),
      ],
    ),
  }),
  CatalogueEntry('ShootIcon', {
    'set': (_) => Wrap(
      spacing: 12,
      runSpacing: 12,
      children: [
        for (final icon in ShootIcons.values)
          ShootIcon(
            icon,
            size: 20,
            strokeWidth: 2,
            color: const Color(0xFF5C5752),
          ),
      ],
    ),
  }),
  CatalogueEntry('ChipGroup', {
    'wrapping': (_) => ChipGroup(
      children: [
        for (final label in [
          'Weddings',
          'Engagements',
          'Portraits',
          'Family',
          'Products',
          'Food and drinks',
          'Property',
        ])
          ShootChip(label: label, on: label == 'Portraits', onTap: _none),
      ],
    ),
  }),
  CatalogueEntry('ShootScaffold', {
    'with corner glow': (_) => const SizedBox(
      width: 320,
      height: 200,
      child: ShootScaffold(child: Center(child: GroupLabel('Content'))),
    ),
  }),
  CatalogueEntry('EmptyState', {
    'with meta': (_) => const EmptyState(
      mark: IconTile.large(ShootIcons.searchQuestion),
      meta: '404',
      title: 'A title',
      body: 'A body line that wraps onto a second line at this width.',
    ),
  }),
  CatalogueEntry('RichContent', {
    'article': (_) => const RichContent(
      nodes: [
        RichHeading('Before the day'),
        RichParagraph('Tell your photographer the times that matter.'),
        RichList(['The ceremony', 'The first dance']),
        RichQuote('Plan the light, not the poses.'),
      ],
    ),
  }),
  CatalogueEntry('SceneTile', {
    'three variants': (_) => const Row(
      spacing: ShootSpace.s3,
      children: [
        SizedBox.square(dimension: 80, child: SceneTile()),
        SizedBox.square(dimension: 80, child: SceneTile(variant: 1)),
        SizedBox.square(dimension: 80, child: SceneTile(variant: 2)),
      ],
    ),
  }),
  CatalogueEntry('GoldenHourScene', {
    'scene': (_) => const SizedBox(height: 200, child: GoldenHourScene()),
  }),
  CatalogueEntry('AmbientPause', {
    'pause control': (_) => const AmbientPause(
      child: AmbientPauseButton(
        pauseLabel: 'Pause motion',
        playLabel: 'Play motion',
      ),
    ),
  }),
];
