import 'package:equatable/equatable.dart';
import 'package:shoot_mobile/features/site/domain/entities/brief_builder.dart';

/// The business time zone's offset from UTC: the UAE has no daylight saving (001 FR-015).
const businessUtcOffset = Duration(hours: 4);

/// Today's date in the business time zone as `YYYY-MM-DD`.
String businessToday(DateTime now) {
  final local = now.toUtc().add(businessUtcOffset);
  return formatIsoDate(local.year, local.month, local.day);
}

String formatIsoDate(int y, int m, int d) =>
    '${y.toString().padLeft(4, '0')}-${m.toString().padLeft(2, '0')}-${d.toString().padLeft(2, '0')}';

/// A brief being built: the chosen values of each slot (in the order picked), the slots the
/// person skipped, and the date. Immutable; [BriefEngine] makes the changes.
final class BriefDraft extends Equatable {
  const BriefDraft({
    this.values = const {},
    this.skipped = const {},
    this.date,
  });

  /// Slot token to chosen option values.
  final Map<String, List<String>> values;
  final Set<String> skipped;

  /// `YYYY-MM-DD`, or `null` for "any date".
  final String? date;

  bool get isEmpty => values.isEmpty && skipped.isEmpty && date == null;

  List<String> valuesOf(String token) => values[token] ?? const [];

  @override
  List<Object?> get props => [values, skipped, date];
}

/// A change to a draft and the slot tokens whose answers it cleared.
typedef DraftChange = ({BriefDraft draft, List<String> cleared});

/// The rules of the brief, step by step (001 FR-046 to FR-068), free of Flutter.
final class BriefEngine {
  const BriefEngine(this.config);

  final BriefBuilderConfig config;

  List<BuilderSlot> get slots => config.slots;

  BuilderSlot? slot(String token) {
    for (final s in slots) {
      if (s.token == token) return s;
    }
    return null;
  }

  BuilderSlot? get personaSlot {
    for (final s in slots) {
      if (s.kind == SlotKind.persona) return s;
    }
    return null;
  }

  /// The professional types chosen so far.
  List<String> chosenPersonas(BriefDraft draft) {
    final p = personaSlot;
    return p == null ? const [] : draft.valuesOf(p.token);
  }

  /// The options [slot] offers now: for a slot other than the professional type, only those that
  /// apply to every chosen type (an option with no types applies to all), in configured order,
  /// with the slot's default listed first. A default is never chosen for the person (FR-055).
  List<BuilderOption> visibleOptions(BuilderSlot slot, BriefDraft draft) {
    final chosen = chosenPersonas(draft);
    final base = slot.kind == SlotKind.persona || chosen.isEmpty
        ? slot.options
        : slot.options
              .where(
                (o) =>
                    o.personaSlugs.isEmpty ||
                    chosen.every(o.personaSlugs.contains),
              )
              .toList();
    final i = base.indexWhere((o) => o.value == slot.defaultValue);
    if (i <= 0) return base;
    return [base[i], ...base.sublist(0, i), ...base.sublist(i + 1)];
  }

  bool isAnswered(BuilderSlot s, BriefDraft draft) {
    if (s.kind == SlotKind.date) return draft.date != null;
    return draft.valuesOf(s.token).isNotEmpty;
  }

  /// The first slot that is neither answered nor skipped, or `null` when every step is done.
  BuilderSlot? nextStep(BriefDraft draft) {
    for (final s in slots) {
      if (!isAnswered(s, draft) && !draft.skipped.contains(s.token)) return s;
    }
    return null;
  }

  /// The first required slot still unanswered, or `null` when the brief can be sent.
  BuilderSlot? firstMissing(BriefDraft draft) {
    for (final s in slots) {
      if (s.required && !isAnswered(s, draft)) return s;
    }
    return null;
  }

  bool isComplete(BriefDraft draft) => firstMissing(draft) == null;

  /// Chooses [value] in [token]. A single-choice slot replaces its value; a multiple one toggles
  /// it. A change to the professional type clears answers the remaining options no longer offer.
  DraftChange choose(BriefDraft draft, String token, String value) {
    final s = slot(token);
    if (s == null) return (draft: draft, cleared: const []);
    final next = Map<String, List<String>>.of(draft.values);
    final current = draft.valuesOf(token);
    if (s.multiple) {
      final updated = current.contains(value)
          ? current.where((v) => v != value).toList()
          : [...current, value];
      if (updated.isEmpty) {
        next.remove(token);
      } else {
        next[token] = updated;
      }
    } else {
      next[token] = [value];
    }
    final skipped = {...draft.skipped}..remove(token);
    return _revalidate(
      BriefDraft(values: next, skipped: skipped, date: draft.date),
      changed: token,
    );
  }

  DraftChange _revalidate(BriefDraft draft, {required String changed}) {
    if (personaSlot?.token != changed) return (draft: draft, cleared: const []);
    final values = Map<String, List<String>>.of(draft.values);
    final cleared = <String>[];
    for (final s in slots) {
      if (s.kind == SlotKind.persona || s.kind == SlotKind.date) continue;
      final held = values[s.token];
      if (held == null) continue;
      final offered = visibleOptions(
        s,
        BriefDraft(values: values),
      ).map((o) => o.value).toSet();
      final keep = held.where(offered.contains).toList();
      if (keep.length == held.length) continue;
      cleared.add(s.token);
      if (keep.isEmpty) {
        values.remove(s.token);
      } else {
        values[s.token] = keep;
      }
    }
    return (
      draft: BriefDraft(
        values: values,
        skipped: draft.skipped,
        date: draft.date,
      ),
      cleared: cleared,
    );
  }

  BriefDraft skip(BriefDraft draft, String token) => BriefDraft(
    values: draft.values,
    skipped: {...draft.skipped, token},
    date: draft.date,
  );

  /// Sets the date (`null` clears it). A date before today in the business time zone is refused:
  /// the draft is returned unchanged and `dateRefused` is true.
  ({BriefDraft draft, bool dateRefused}) setDate(
    BriefDraft draft,
    String? iso,
    DateTime now,
  ) {
    if (iso != null && iso.compareTo(businessToday(now)) < 0) {
      return (draft: draft, dateRefused: true);
    }
    final skipped = {...draft.skipped};
    if (iso != null) {
      skipped.removeAll(
        slots.where((s) => s.kind == SlotKind.date).map((s) => s.token),
      );
    }
    return (
      draft: BriefDraft(values: draft.values, skipped: skipped, date: iso),
      dateRefused: false,
    );
  }

  /// Takes back the last answer: the last answered or skipped slot in sentence order.
  BriefDraft takeBack(BriefDraft draft) {
    for (final s in slots.reversed) {
      if (s.kind == SlotKind.date && draft.date != null) {
        return BriefDraft(values: draft.values, skipped: draft.skipped);
      }
      if (s.kind != SlotKind.date && draft.valuesOf(s.token).isNotEmpty) {
        return BriefDraft(
          values: Map.of(draft.values)..remove(s.token),
          skipped: draft.skipped,
          date: draft.date,
        );
      }
      if (draft.skipped.contains(s.token)) {
        return BriefDraft(
          values: draft.values,
          skipped: {...draft.skipped}..remove(s.token),
          date: draft.date,
        );
      }
    }
    return draft;
  }

  /// Reopens [token]: its answer is removed so its list shows again.
  BriefDraft reopen(BriefDraft draft, String token) {
    final s = slot(token);
    if (s == null) return draft;
    if (s.kind == SlotKind.date) {
      return BriefDraft(
        values: draft.values,
        skipped: {...draft.skipped}..remove(token),
      );
    }
    return BriefDraft(
      values: Map.of(draft.values)..remove(token),
      skipped: {...draft.skipped}..remove(token),
      date: draft.date,
    );
  }

  /// Options of every step whose label contains [query] (case-insensitive), with their slot, so
  /// typing searches all steps at once (FR-012).
  List<({BuilderSlot slot, BuilderOption option})> search(
    BriefDraft draft,
    String query,
  ) {
    final q = query.trim().toLowerCase();
    if (q.isEmpty) return const [];
    return [
      for (final s in slots)
        if (s.kind != SlotKind.date)
          for (final o in visibleOptions(s, draft))
            if (o.label.toLowerCase().contains(q)) (slot: s, option: o),
    ];
  }

  /// The words an option prints into the sentence.
  String sentenceWord(BuilderSlot s, String value) {
    for (final o in s.options) {
      if (o.value == value) {
        return o.sentenceLabel.isEmpty ? o.label : o.sentenceLabel;
      }
    }
    return value;
  }
}
