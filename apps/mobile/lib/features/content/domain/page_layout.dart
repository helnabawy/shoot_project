import 'package:shoot_mobile/core/content/cta.dart';
import 'package:shoot_mobile/core/content/sections.dart';
import 'package:shoot_mobile/features/content/domain/entities/editor_page.dart';

/// Which sections of an editor-built page the app draws (research R1): numbered steps, questions,
/// long-form text and a call to action. Every other type (logos, creator network, persona band,
/// features, categories, and any type added later) is skipped.
bool isDrawn(Section section) =>
    section is HowItWorksSection ||
    section is FaqSection ||
    section is RichTextSection ||
    section is CallToActionSection;

/// The sections of [page] the app draws, in the editor's order.
List<Section> drawnSections(EditorPage page) =>
    page.sections.where(isDrawn).toList();

/// The page's introduction: the subheading of a steps section that comes first (board 35), else none.
String? introOf(EditorPage page) {
  final sections = drawnSections(page);
  if (sections.isEmpty) return null;
  final first = sections.first;
  if (first is! HowItWorksSection) return null;
  final text = first.subheading?.trim();
  return text == null || text.isEmpty ? null : text;
}

/// The page's own primary action: the first call-to-action section's primary action. `null` means
/// the default, "Start a brief" (FR-021).
Cta? pageAction(EditorPage page) {
  for (final section in drawnSections(page)) {
    if (section is CallToActionSection && section.primary != null) {
      return section.primary;
    }
  }
  return null;
}

/// A page the app can draw nothing of shows one row that opens it on the website (research R1).
bool isEmptyForApp(EditorPage page) => drawnSections(page).isEmpty;
