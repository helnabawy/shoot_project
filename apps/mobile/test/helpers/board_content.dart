import 'package:shoot_mobile/core/content/rich_text.dart';
import 'package:shoot_mobile/core/content/sections.dart';
import 'package:shoot_mobile/features/content/domain/entities/editor_page.dart';
import 'package:shoot_mobile/features/content/domain/entities/guides.dart';
import 'package:shoot_mobile/features/content/domain/entities/legal.dart';

import 'content_fixtures.dart';

/// The boards' own placeholder text as CMS data, in English and Arabic, so a golden shows the
/// same words as the board it is compared with (design-fidelity). The Arabic is the CMS text the
/// derived Arabic references use (`strings.ar/<board>.json`, key `cms`).

String _t(bool arabic, String en, String ar) => arabic ? ar : en;

/// Board 33: five guides in three topics, page 1 of 3.
GuideList boardGuides({required bool arabic}) {
  final briefing = _t(arabic, 'Briefing', 'كتابة الطلب');
  final booking = _t(arabic, 'Booking', 'الحجز');
  final preparing = _t(arabic, 'Preparing', 'التحضير');
  final team = _t(arabic, 'Shoot team', 'فريق شوت');
  ArticleSummary row(String slug, String topic, String title, int minutes) =>
      summaryOf(
        slug,
        title: title,
        topic: topic,
        minutes: minutes,
        authorName: team,
      );
  return guideListOf(
    [
      row(
        'brief',
        briefing,
        _t(
          arabic,
          'How to brief a wedding photographer',
          'كيف تكتب طلبك لمصور حفلات الزفاف',
        ),
        4,
      ),
      row(
        'quote',
        booking,
        _t(arabic, 'What your quotation includes', 'ماذا يتضمن عرض السعر'),
        3,
      ),
      row(
        'prepare',
        preparing,
        _t(
          arabic,
          'What to prepare the day before a shoot',
          'ماذا تحضّر قبل يوم من التصوير',
        ),
        5,
      ),
      row(
        'photo-or-video',
        briefing,
        _t(
          arabic,
          'Photo or video: which does your event need?',
          'تصوير أم فيديو: ماذا تحتاج فعاليتك؟',
        ),
        4,
      ),
      row(
        'editing',
        preparing,
        _t(
          arabic,
          'How long editing takes, and why',
          'كم يستغرق التعديل ولماذا',
        ),
        3,
      ),
    ],
    pageCount: 3,
    locale: _t(arabic, 'en', 'ar'),
    categories: [
      GuideCategory(
        slug: 'briefing',
        name: briefing,
        description: null,
        count: 2,
      ),
      GuideCategory(
        slug: 'booking',
        name: booking,
        description: null,
        count: 1,
      ),
      GuideCategory(
        slug: 'preparing',
        name: preparing,
        description: null,
        count: 2,
      ),
    ],
  );
}

/// Board 34: an article with a lead, two sections and a list, and two more guides.
Article boardArticle({required bool arabic}) {
  final briefing = _t(arabic, 'Briefing', 'كتابة الطلب');
  final team = _t(arabic, 'Shoot team', 'فريق شوت');
  final heading0 = _t(arabic, '[SECTION HEADING]', '[عنوان القسم]');
  final more = boardGuides(arabic: arabic).items;
  return Article(
    summary: ArticleSummary(
      slug: 'brief',
      title: _t(
        arabic,
        'How to brief a wedding photographer',
        'كيف تكتب طلبك لمصور حفلات الزفاف',
      ),
      summary: _t(
        arabic,
        '[LEAD PARAGRAPH FROM CMS. One or two sentences that answer the title.]',
        '[فقرة تمهيدية من نظام إدارة المحتوى. جملة أو جملتان تجيبان عن العنوان.]',
      ),
      cover: null,
      publishedAt: DateTime.utc(2026, 10),
      readingMinutes: 4,
      categories: [GuideTag(slug: 'briefing', name: briefing)],
      author: GuideTag(slug: 'shoot-team', name: team),
      inRequestedLanguage: true,
    ),
    body: RichTextDocument([
      heading(heading0),
      paragraph(
        _t(
          arabic,
          '[BODY TEXT FROM CMS. Short paragraphs at 16 px with a 1.6 line height, so a line holds about 45 characters on a phone.]',
          '[نص من نظام إدارة المحتوى. فقرات قصيرة بحجم ١٦ ونصف قطر سطر ١٫٦، فيتسع السطر لنحو ٤٥ حرفاً على الهاتف.]',
        ),
      ),
      ListBlock(
        ordered: false,
        items: [
          for (var i = 0; i < 3; i++)
            [
              paragraph(
                _t(
                  arabic,
                  '[LIST ITEM FROM CMS]',
                  '[عنصر قائمة من نظام إدارة المحتوى]',
                ),
              ),
            ],
        ],
      ),
      heading(heading0),
      paragraph(
        _t(arabic, '[BODY TEXT FROM CMS.]', '[نص من نظام إدارة المحتوى.]'),
      ),
    ]),
    related: [more[1], more[2]],
  );
}

/// Board 35: "How it works" with three steps and four questions, the first answered.
EditorPage boardPage({required bool arabic}) {
  final question = _t(
    arabic,
    '[QUESTION FROM CMS]',
    '[سؤال من نظام إدارة المحتوى]',
  );
  return pageOf(_t(arabic, 'How it works', 'كيف يعمل'), [
    HowItWorksSection(
      anchor: null,
      heading: _t(arabic, 'How it works', 'كيف يعمل'),
      subheading: _t(
        arabic,
        '[INTRO FROM CMS: one or two lines.]',
        '[مقدمة من نظام إدارة المحتوى: سطر أو سطران.]',
      ),
      steps: [
        HowItWorksStep(
          title: _t(arabic, 'Say it in one line', 'قلها في سطر واحد'),
          body: _t(
            arabic,
            'Tap the words to build your brief: who you need, for what, where and when. No form to fill, no account to make.',
            'اضغط على الكلمات لتبني طلبك: من تحتاج، ولأي غرض، وأين ومتى. لا نموذج تملؤه ولا حساب تنشئه.',
          ),
          visual: StepVisual.brief,
        ),
        HowItWorksStep(
          title: _t(
            arabic,
            'See the price before anything else',
            'اطّلع على السعر قبل أي شيء',
          ),
          body: _t(
            arabic,
            'One fixed price for your brief, and the professionals available on your date. Pick one; nothing is paid on the site.',
            'سعر ثابت واحد لطلبك، والمحترفون المتاحون في تاريخك. اختر واحداً؛ لا يُدفع شيء على الموقع.',
          ),
          visual: StepVisual.match,
        ),
        HowItWorksStep(
          title: _t(arabic, 'Your number is your account', 'رقمك هو حسابك'),
          body: _t(
            arabic,
            'At the last step we text you a six-digit code. That signs you in, saves your booking, and opens the WhatsApp chat with your professional.',
            'في الخطوة الأخيرة نرسل إليك رمزاً من ستة أرقام. به تسجّل الدخول ويُحفظ حجزك وتُفتح محادثة واتساب مع محترفك.',
          ),
          visual: StepVisual.work,
        ),
      ],
      cta: null,
    ),
    FaqSection(
      anchor: null,
      heading: _t(arabic, 'Questions', 'الأسئلة'),
      items: [
        FaqItem(
          question: question,
          answer: RichTextDocument([
            paragraph(
              _t(
                arabic,
                '[ANSWER FROM CMS. Plain sentences, at most four lines.]',
                '[إجابة من نظام إدارة المحتوى. جمل بسيطة، أربعة أسطر على الأكثر.]',
              ),
            ),
          ]),
        ),
        for (var i = 0; i < 3; i++)
          FaqItem(
            question: question,
            answer: RichTextDocument([paragraph('')]),
          ),
      ],
    ),
  ], path: '/how-it-works');
}

/// Board 36: the Terms, version 3 from 1 November, five sections (the contents list five rows;
/// the board's text shows the first).
LegalDocument boardLegal({required bool arabic}) {
  final title = _t(
    arabic,
    '[SECTION TITLE FROM CMS]',
    '[عنوان القسم من نظام إدارة المحتوى]',
  );
  return LegalDocument(
    locale: _t(arabic, 'en', 'ar'),
    kind: LegalKind.terms,
    title: _t(arabic, 'Terms', 'الشروط والأحكام'),
    version: 3,
    effectiveFrom: DateTime.utc(2026, 11),
    until: null,
    body: RichTextDocument([
      heading('1. $title'),
      paragraph(
        _t(
          arabic,
          '[LEGAL TEXT FROM CMS. Body at 16 px with a 1.6 line height. Numbered clauses keep their numbers in Arabic and English.]',
          '[نص قانوني من نظام إدارة المحتوى. الخط بحجم ١٦ وارتفاع سطر ١٫٦. البنود المرقمة تحتفظ بأرقامها بالعربية والإنجليزية.]',
        ),
      ),
      paragraph(
        _t(
          arabic,
          '[LEGAL TEXT FROM CMS.]',
          '[نص قانوني من نظام إدارة المحتوى.]',
        ),
      ),
    ]),
    inRequestedLanguage: true,
  );
}
