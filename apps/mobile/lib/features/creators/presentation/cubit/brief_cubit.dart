import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shoot_mobile/features/creators/domain/brief/brief_rules.dart';
import 'package:shoot_mobile/features/site/domain/entities/brief_builder.dart';

/// The answers a person has given, kept while the app is open so choosing another creator keeps
/// them (MC-US2-S5). Cleared when a brief is sent.
final class BriefDraft {
  Map<String, String> values = const {};

  void clear() => values = const {};
}

final class BriefState extends Equatable {
  const BriefState({
    required this.rules,
    required this.values,
    required this.today,
    this.openToken,
  });

  final BriefRules rules;
  final Map<String, String> values;

  /// Today, `YYYY-MM-DD` (the business day), for the date rule.
  final String today;

  /// The slot whose options are shown because the person tapped it; `null` shows the next
  /// unanswered one.
  final String? openToken;

  BriefCreator? get creator => rules.creator;

  BuilderSlot? get nextSlot => rules.nextOpen(values, today: today);

  /// The slot whose choices show now.
  BuilderSlot? get activeSlot {
    final token = openToken;
    if (token != null) {
      for (final slot in rules.config.slots) {
        if (slot.token == token) return slot;
      }
    }
    return nextSlot;
  }

  int get openCount => rules.openCount(values, today: today);
  bool get isComplete => rules.isComplete(values, today: today);

  /// False when this creator offers nothing the brief asks for (WhatsApp is offered instead).
  bool get canComplete => rules.canComplete(values);

  @override
  List<Object?> get props => [
    rules.config,
    rules.creator,
    values,
    today,
    openToken,
  ];
}

/// The step-by-step brief of screens 17 and 19 (MC-US2, MC-US5), driven by the CMS brief builder.
/// [initial] are answers to start from (the page's presets, or the kept draft); anything that is
/// not an option (any more) is left open (MC FR-051).
class BriefCubit extends Cubit<BriefState> {
  BriefCubit({
    required BriefRules rules,
    required String today,
    Map<String, String> initial = const {},
    this._draft,
  }) : super(
         BriefState(
           rules: rules,
           today: today,
           values: rules.withFixed(rules.keepValid(initial)),
         ),
       );

  final BriefDraft? _draft;

  void _set(Map<String, String> values) {
    final rules = state.rules;
    final next = rules.withFixed(rules.keepValid(values));
    _draft?.values = next;
    emit(BriefState(rules: rules, values: next, today: state.today));
  }

  /// Chooses [value] for [slot]; a multiple slot toggles it. A change that makes a later answer
  /// invalid (a different type) drops that answer.
  void choose(BuilderSlot slot, String value) {
    final values = Map<String, String>.of(state.values);
    if (slot.multiple) {
      final current = BriefRules.split(values[slot.token] ?? '');
      current.contains(value) ? current.remove(value) : current.add(value);
      current.isEmpty
          ? values.remove(slot.token)
          : values[slot.token] = current.join(',');
    } else {
      values[slot.token] = value;
    }
    _set(values);
  }

  /// A typed value (an occasion in the person's words, a number, an ISO date); empty clears it.
  void setText(BuilderSlot slot, String value) {
    final values = Map<String, String>.of(state.values);
    final text = value.trim();
    text.isEmpty ? values.remove(slot.token) : values[slot.token] = text;
    _set(values);
  }

  /// Shows [slot]'s choices again so the person can change it.
  void reopen(BuilderSlot slot) => emit(
    BriefState(
      rules: state.rules,
      values: state.values,
      today: state.today,
      openToken: slot.token,
    ),
  );

  /// The WhatsApp message for the finished brief, or `null` while it is not complete.
  String? message({
    String Function(String iso)? formatDate,
    String? creatorLine,
  }) {
    if (!state.isComplete) return null;
    final creator = state.creator;
    return state.rules.message(
      state.values,
      formatDate: formatDate,
      creatorText: creator == null
          ? null
          : '${creator.name} (${creator.displayCode})',
      creatorLine: creatorLine,
    );
  }

  /// The brief was sent: the draft is cleared.
  void sent() => _draft?.clear();
}
