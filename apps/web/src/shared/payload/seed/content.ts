import { rt, type L } from './localize'

// Default content for a fresh environment. Arabic copy is a starting point for the owner to review.
// Only states what the product actually does: no invented proof, prices or claims (PRODUCT.md).

export const personas = [
  {
    slug: 'photographer',
    glyph: { en: 'PH', ar: 'ص' },
    order: 1,
    singular: { en: 'Photographer', ar: 'مصوّر' },
    plural: { en: 'Photographers', ar: 'مصوّرون' },
    description: { en: 'Photos for events, people, products and places.', ar: 'صور للفعاليات والأشخاص والمنتجات والأماكن.' },
    copy: {
      seekerCta: { en: 'I need a {persona.singular}', ar: 'أحتاج {persona.singular}' },
      providerCta: { en: "I'm a {persona.singular}", ar: 'أنا {persona.singular}' },
      providerPitch: { en: 'Create a free account and tell us what you shoot.', ar: 'أنشئ حساباً مجانياً وأخبرنا بما تصوّره.' },
    },
  },
  {
    slug: 'videographer',
    glyph: { en: 'VI', ar: 'ف' },
    order: 2,
    singular: { en: 'Videographer', ar: 'مصوّر فيديو' },
    plural: { en: 'Videographers', ar: 'مصوّرو فيديو' },
    description: { en: 'Films, reels and event coverage.', ar: 'أفلام ومقاطع قصيرة وتغطية فعاليات.' },
    copy: {
      seekerCta: { en: 'I need a {persona.singular}', ar: 'أحتاج {persona.singular}' },
      providerCta: { en: "I'm a {persona.singular}", ar: 'أنا {persona.singular}' },
      providerPitch: { en: 'Create a free account and tell us what you film.', ar: 'أنشئ حساباً مجانياً وأخبرنا بما تصوّره.' },
    },
  },
] as const

export const categories: { slug: string; glyph: L; order: number; name: L; personas: string[]; seo: { title: L; description: L; intro: L } }[] = [
  { slug: 'portrait', glyph: { en: 'P', ar: 'ب' }, order: 1, name: { en: 'Portrait', ar: 'بورتريه' }, personas: ['photographer', 'videographer'], seo: { title: { en: 'Portrait photographers and videographers in the UAE', ar: 'مصورو بورتريه في الإمارات' }, description: { en: 'Book a portrait shoot in the UAE. Tell us what you need and we reply on WhatsApp.', ar: 'احجز جلسة بورتريه في الإمارات. أخبرنا بما تحتاجه ونرد عليك عبر واتساب.' }, intro: { en: 'Portraits of people, families and brands, shot where you like.', ar: 'بورتريه للأفراد والعائلات والعلامات التجارية، في المكان الذي تختاره.' } } },
  { slug: 'events', glyph: { en: 'E', ar: 'ف' }, order: 2, name: { en: 'Events', ar: 'فعاليات' }, personas: ['photographer', 'videographer'], seo: { title: { en: 'Event photographers and videographers in the UAE', ar: 'مصورو فعاليات في الإمارات' }, description: { en: 'Book event coverage in the UAE, from private parties to conferences. We reply on WhatsApp.', ar: 'احجز تغطية فعالية في الإمارات، من الحفلات الخاصة إلى المؤتمرات. نرد عليك عبر واتساب.' }, intro: { en: 'Birthdays, launches, conferences and everything in between.', ar: 'أعياد ميلاد وإطلاقات ومؤتمرات وكل ما بينها.' } } },
  { slug: 'fashion-beauty', glyph: { en: 'F', ar: 'أز' }, order: 3, name: { en: 'Fashion & beauty', ar: 'أزياء وجمال' }, personas: ['photographer', 'videographer'], seo: { title: { en: 'Fashion and beauty shoots in the UAE', ar: 'جلسات أزياء وجمال في الإمارات' }, description: { en: 'Book a fashion or beauty shoot in the UAE with a professional photographer or videographer.', ar: 'احجز جلسة أزياء أو جمال في الإمارات مع مصور أو مصور فيديو محترف.' }, intro: { en: 'Lookbooks, campaigns and beauty content, from one look to a full collection.', ar: 'كتالوجات وحملات ومحتوى جمال، من إطلالة واحدة إلى مجموعة كاملة.' } } },
  { slug: 'wedding-engagement', glyph: { en: 'W', ar: 'ز' }, order: 4, name: { en: 'Wedding & engagement', ar: 'أعراس وخطوبة' }, personas: ['photographer', 'videographer'], seo: { title: { en: 'Wedding and engagement photographers in the UAE', ar: 'مصورو أعراس وخطوبة في الإمارات' }, description: { en: 'Book wedding or engagement photography and video in the UAE. We reply on WhatsApp.', ar: 'احجز تصوير حفل زفاف أو خطوبة في الإمارات بالصور والفيديو. نرد عليك عبر واتساب.' }, intro: { en: 'Your day, covered quietly and completely.', ar: 'يومك، مغطّى بهدوء وبشكل كامل.' } } },
  { slug: 'corporate-branding', glyph: { en: 'C', ar: 'ش' }, order: 5, name: { en: 'Corporate & branding', ar: 'شركات وعلامات تجارية' }, personas: ['photographer', 'videographer'], seo: { title: { en: 'Corporate and branding photography in the UAE', ar: 'تصوير الشركات والعلامات التجارية في الإمارات' }, description: { en: 'Book corporate headshots, team days and brand content in the UAE.', ar: 'احجز صور الشركات وأيام الفريق ومحتوى العلامة التجارية في الإمارات.' }, intro: { en: 'Headshots, offices, teams and brand stories.', ar: 'صور شخصية ومكاتب وفرق وقصص علامات تجارية.' } } },
  { slug: 'real-estate-architecture', glyph: { en: 'R', ar: 'ع' }, order: 6, name: { en: 'Real estate & architecture', ar: 'عقارات وعمارة' }, personas: ['photographer', 'videographer'], seo: { title: { en: 'Real estate and architecture photography in the UAE', ar: 'تصوير العقارات والعمارة في الإمارات' }, description: { en: 'Book property and architecture photography or video in the UAE.', ar: 'احجز تصوير عقارات وعمارة بالصور أو الفيديو في الإمارات.' }, intro: { en: 'Homes, developments and spaces, shot to show how they feel.', ar: 'منازل ومشاريع ومساحات، تُصوَّر لتُظهر إحساسها.' } } },
]

type SeedOption = { value: string; glyph: L; label: L }

// The glyph tile is visible text, so it is localised too: Arabic rows lead with an Arabic letter.
const AR_GLYPH: Record<string, string> = {
  'wedding-engagement': 'ز', event: 'ف', portrait: 'ب', 'family-newborn': 'ع', 'friends-party': 'ح', 'fashion-beauty': 'أز',
  clinic: 'عي', products: 'م', 'food-drinks': 'ط', property: 'عق', 'brand-corporate': 'ش', 'social-media': 'تو', car: 'س',
  'sport-fitness': 'ر', 'travel-lifestyle': 'سف', 'documentary-editorial': 'و', 'music-entertainment': 'مو', 'aerial-drone': 'ج',
  '1h': '1س', '2h': '2س', '3h': '3س', '4h': '4س', '8h': '8س',
  dubai: 'د', 'abu-dhabi': 'أظ', 'al-ain': 'ع', sharjah: 'ش', ajman: 'عج', 'ras-al-khaimah': 'ر', fujairah: 'ف', 'umm-al-quwain': 'أق',
  anyone: 'أي', woman: 'هي', man: 'هو',
}
const opt = (value: string, glyph: string, en: string, ar: string): SeedOption => ({
  value,
  glyph: { en: glyph, ar: AR_GLYPH[value] ?? glyph },
  label: { en, ar },
})

export const optionSets: { slug: string; name: L; options: SeedOption[] }[] = [
  {
    slug: 'occasions',
    name: { en: 'Occasions', ar: 'المناسبات' },
    options: [
      opt('wedding-engagement', 'W', 'a wedding or engagement', 'حفل زفاف أو خطوبة'),
      opt('event', 'E', 'an event', 'فعالية'),
      opt('portrait', 'P', 'a portrait session', 'جلسة بورتريه'),
      opt('family-newborn', 'FA', 'a family or newborn shoot', 'تصوير عائلي أو لمولود جديد'),
      opt('friends-party', 'PA', 'friends or a party', 'أصدقاء أو حفلة'),
      opt('fashion-beauty', 'FB', 'a fashion or beauty shoot', 'تصوير أزياء أو تجميل'),
      opt('clinic', 'CL', 'a clinic', 'عيادة'),
      opt('products', 'PR', 'products', 'منتجات'),
      opt('food-drinks', 'FD', 'food and drinks', 'طعام ومشروبات'),
      opt('property', 'RE', 'a property', 'عقار'),
      opt('brand-corporate', 'BR', 'a brand or corporate shoot', 'تصوير لعلامة تجارية أو شركة'),
      opt('social-media', 'SM', 'social media content', 'محتوى لوسائل التواصل'),
      opt('car', 'CA', 'a car', 'سيارة'),
      opt('sport-fitness', 'SP', 'sport or fitness', 'رياضة أو لياقة'),
      opt('travel-lifestyle', 'TR', 'travel or lifestyle', 'سفر أو أسلوب حياة'),
      opt('documentary-editorial', 'DO', 'a documentary or editorial', 'وثائقي أو تحريري'),
      opt('music-entertainment', 'MU', 'music or entertainment', 'موسيقى أو ترفيه'),
      opt('aerial-drone', 'AE', 'aerial or drone shots', 'تصوير جوي أو بالدرون'),
      opt('something-else', '…', 'something else', 'شيء آخر'),
    ],
  },
  {
    slug: 'durations',
    name: { en: 'Durations', ar: 'المدد' },
    options: [
      opt('1h', '1h', '1 hour', 'ساعة واحدة'),
      opt('2h', '2h', '2 hours', 'ساعتين'),
      opt('3h', '3h', '3 hours', '3 ساعات'),
      opt('4h', '4h', '4 hours', '4 ساعات'),
      opt('8h', '8h', '8 hours', '8 ساعات'),
    ],
  },
  {
    slug: 'locations',
    name: { en: 'Emirates', ar: 'الإمارات' },
    options: [
      opt('dubai', 'DXB', 'Dubai', 'دبي'),
      opt('abu-dhabi', 'AUH', 'Abu Dhabi', 'أبوظبي'),
      opt('al-ain', 'AAN', 'Al Ain', 'العين'),
      opt('sharjah', 'SHJ', 'Sharjah', 'الشارقة'),
      opt('ajman', 'AJM', 'Ajman', 'عجمان'),
      opt('ras-al-khaimah', 'RAK', 'Ras Al Khaimah', 'رأس الخيمة'),
      opt('fujairah', 'FUJ', 'Fujairah', 'الفجيرة'),
      opt('umm-al-quwain', 'UAQ', 'Umm Al Quwain', 'أم القيوين'),
    ],
  },
  {
    slug: 'shot-by',
    name: { en: 'Shot by', ar: 'المصوّر' },
    options: [
      opt('anyone', 'ANY', 'anyone', 'أي شخص'),
      opt('woman', 'Her', 'a woman', 'امرأة'),
      opt('man', 'Him', 'a man', 'رجل'),
    ],
  },
]

export const siteSettings = {
  siteName: { en: 'Shoot Project', ar: 'Shoot Project' },
  whatsappNumber: '+971500000000',
  whatsappDefaultMessage: { en: "Hi! I'd like to book a shoot.", ar: 'مرحباً! أرغب في حجز جلسة تصوير.' },
  expectedReplyTime: { en: 'shortly', ar: 'قريباً' },
  labels: {
    seekerLabel: { en: 'I need a {persona.singular}', ar: 'أحتاج {persona.singular}' },
    providerLabel: { en: "I'm a {persona.singular}", ar: 'أنا {persona.singular}' },
  },
  briefLimitPerHour: 5,
  creatorCodePrefix: 'CR',
  autoPublishEdits: false,
  directoryPageSize: 24,
  footerGroups: [{ key: 'company', label: { en: 'Company', ar: 'الشركة' } }],
}

export const BRIEF_SENTENCE: L = {
  en: 'I need a {persona} for {occasion} on {date} for {duration} in {location}, shot by {shotBy}.',
  ar: 'أحتاج {persona} من أجل {occasion} بتاريخ {date} لمدة {duration} في {location}، والتصوير بواسطة {shotBy}.',
}

/** Slots reference option sets by slug; the seed runner swaps slugs for ids. */
export const briefSlots = [
  { token: 'persona', kind: 'persona', defaultValue: 'photographer', required: true, allowCustom: false, multiple: true, groupLabel: { en: 'Professional', ar: 'المحترف' }, placeholder: { en: 'which professional', ar: 'أي محترف' } },
  { token: 'occasion', kind: 'options', optionSet: 'occasions', defaultValue: 'event', required: true, allowCustom: true, groupLabel: { en: 'Occasion', ar: 'المناسبة' }, placeholder: { en: 'what occasion', ar: 'أي مناسبة' } },
  { token: 'date', kind: 'date', required: false, allowCustom: false, groupLabel: { en: 'When', ar: 'متى' }, placeholder: { en: 'any date', ar: 'أي تاريخ' } },
  { token: 'duration', kind: 'options', optionSet: 'durations', defaultValue: '2h', required: true, allowCustom: false, groupLabel: { en: 'How long', ar: 'المدة' }, placeholder: { en: 'how long', ar: 'كم من الوقت' } },
  { token: 'location', kind: 'options', optionSet: 'locations', defaultValue: 'dubai', required: true, allowCustom: false, groupLabel: { en: 'Emirate', ar: 'الإمارة' }, placeholder: { en: 'which emirate', ar: 'أي إمارة' } },
  { token: 'shotBy', kind: 'options', optionSet: 'shot-by', defaultValue: 'anyone', required: true, allowCustom: false, groupLabel: { en: 'Shot by', ar: 'المصوّر' }, placeholder: { en: 'whom', ar: 'مَن' } },
] as const

export const landingPage = {
  hero: {
    eyebrow: { en: 'Quick match', ar: 'مطابقة سريعة' },
    headline: { en: 'You brief. We shoot.', ar: 'أنت تحدّد. نحن نصوّر.' },
    subheadline: {
      en: 'Describe the shoot in one line. We find a professional who is free that day and reply on WhatsApp.',
      ar: 'صِف التصوير في سطر واحد. نجد لك محترفاً متاحاً في ذلك اليوم ونردّ عليك عبر واتساب.',
    },
    trustChips: [
      { text: { en: 'No account needed', ar: 'لا حاجة لحساب' } },
      { text: { en: 'Reply on WhatsApp', ar: 'نردّ عبر واتساب' } },
      { text: { en: 'English & العربية', ar: 'العربية و English' } },
    ],
    layout: 'briefBuilder',
  },
  briefBuilder: {
    enabled: true,
    sentence: BRIEF_SENTENCE,
    submitLabel: { en: "See who's free for this", ar: 'اعرف من المتاح لهذا' },
    helperText: {
      en: 'Free to ask. Tap any part to change it, or type your own words.',
      ar: 'السؤال مجاني. اضغط على أي جزء لتغييره، أو اكتب بكلماتك.',
    },
    whatsappTemplate: {
      en: 'Hi! I need a {persona} for {occasion} on {date} for {duration} in {location}, shot by {shotBy}.',
      ar: 'مرحباً! أحتاج {persona} من أجل {occasion} بتاريخ {date} لمدة {duration} في {location}، والتصوير بواسطة {shotBy}.',
    },
    successMessage: {
      en: 'We have your brief and will find who is free.',
      ar: 'استلمنا طلبك وسنبحث عمّن هو متاح.',
    },
    steps: [
      { title: { en: 'Your shoot', ar: 'التصوير' }, description: { en: 'Describe it in one line.', ar: 'صِفه في سطر واحد.' } },
      { title: { en: 'Your professional', ar: 'المحترف' }, description: { en: 'We find who is free that day.', ar: 'نجد من هو متاح في ذلك اليوم.' } },
      { title: { en: 'Your details', ar: 'بياناتك' }, description: { en: 'We confirm on WhatsApp.', ar: 'نؤكد معك عبر واتساب.' } },
      { title: { en: 'Your quote', ar: 'العرض' }, description: { en: 'One clear price before you book.', ar: 'سعر واضح واحد قبل الحجز.' } },
    ],
  },
  navigation: [
    { label: { en: 'How it works', ar: 'كيف نعمل' }, target: '#how-it-works' },
    { label: { en: 'Specialties', ar: 'التخصصات' }, target: '#specialties' },
    { label: { en: 'Questions', ar: 'أسئلة' }, target: '#faq' },
  ],
  sections: [
    {
      blockType: 'howItWorks',
      anchor: 'how-it-works',
      heading: { en: 'How it works', ar: 'كيف نعمل' },
      subheading: { en: 'Three steps, one conversation.', ar: 'ثلاث خطوات ومحادثة واحدة.' },
      steps: [
        { title: { en: 'Brief', ar: 'الطلب' }, body: { en: 'Tell us what you need in one line, in English or Arabic.', ar: 'أخبرنا بما تحتاجه في سطر واحد، بالعربية أو الإنجليزية.' } },
        { title: { en: 'Match', ar: 'المطابقة' }, body: { en: 'We find a professional who is free on your date.', ar: 'نجد محترفاً متاحاً في التاريخ الذي تختاره.' } },
        { title: { en: 'Shoot', ar: 'التصوير' }, body: { en: 'They show up and shoot. You get the finished work.', ar: 'يحضر المحترف ويصوّر، وتستلم العمل النهائي.' } },
      ],
      cta: { label: { en: '', ar: '' }, kind: 'link', href: '#brief' },
    },
    {
      blockType: 'features',
      anchor: 'why-us',
      heading: { en: 'Why book this way', ar: 'لماذا تحجز بهذه الطريقة' },
      items: [
        { glyph: { en: 'Aa', ar: 'أب' }, title: { en: 'One sentence, no forms', ar: 'جملة واحدة بلا نماذج' }, body: { en: 'Pick the words that fit. Nothing else to fill in.', ar: 'اختر الكلمات المناسبة. لا شيء آخر لتعبئته.' } },
        { glyph: { en: 'WA', ar: 'و' }, title: { en: 'A person replies', ar: 'يردّ عليك شخص حقيقي' }, body: { en: 'Your brief reaches our team on WhatsApp.', ar: 'يصل طلبك إلى فريقنا عبر واتساب.' } },
        { glyph: { en: 'ع', ar: 'En' }, title: { en: 'Arabic and English', ar: 'العربية والإنجليزية' }, body: { en: 'Use the site and talk to us in either language.', ar: 'استخدم الموقع وتحدّث معنا بأي من اللغتين.' } },
        { glyph: '✓', title: { en: 'No account needed', ar: 'لا حاجة لحساب' }, body: { en: 'Create one later if you want your briefs in one place.', ar: 'أنشئ حساباً لاحقاً إن أردت جمع طلباتك في مكان واحد.' } },
      ],
    },
    {
      blockType: 'categoriesGrid',
      anchor: 'specialties',
      heading: { en: 'Specialties', ar: 'التخصصات' },
      subheading: { en: 'What our professionals shoot.', ar: 'ما يصوّره محترفونا.' },
      source: 'active',
    },
    {
      blockType: 'creatorNetwork',
      anchor: 'our-network',
      heading: { en: 'Our network', ar: 'شبكتنا' },
      subheading: { en: 'Meet the people behind the shoots.', ar: 'تعرّف على من يقف وراء الجلسات.' },
      rule: 'featuredThenNewest',
      count: 6,
      cta: { label: { en: 'See everyone', ar: 'عرض الجميع' }, kind: 'link', href: '/creators' },
    },
    {
      blockType: 'personaBand',
      anchor: 'for-professionals',
      heading: { en: 'Are you a {personas.list}?', ar: 'هل أنت {personas.list}؟' },
      body: { en: 'Create a free account and tell us what you shoot.', ar: 'أنشئ حساباً مجانياً وأخبرنا بما تصوّره.' },
      layout: 'combined',
      cta: { label: { en: 'Join as a professional', ar: 'انضم كمحترف' }, kind: 'link', href: '/register?type=provider' },
    },
    {
      blockType: 'faq',
      anchor: 'faq',
      heading: { en: 'Questions', ar: 'أسئلة' },
      items: [
        { question: { en: 'Do I need an account?', ar: 'هل أحتاج إلى حساب؟' }, answer: rt('No. Send a brief and we reply on WhatsApp. An account only keeps your briefs in one place.', 'لا. أرسل طلبك ونردّ عليك عبر واتساب. الحساب يحفظ طلباتك في مكان واحد فقط.') },
        { question: { en: 'What happens after I send a brief?', ar: 'ماذا يحدث بعد إرسال الطلب؟' }, answer: rt('You get a reference, and our team messages you on WhatsApp to confirm the details.', 'تحصل على رقم مرجع، ويتواصل معك فريقنا عبر واتساب لتأكيد التفاصيل.') },
        { question: { en: 'Which emirates do you cover?', ar: 'ما الإمارات التي تغطّونها؟' }, answer: rt('Pick any emirate in the brief. If we cannot cover it, we will tell you straight away.', 'اختر أي إمارة في الطلب. وإن لم نتمكن من تغطيتها سنخبرك فوراً.') },
        { question: { en: "Can I describe something that isn't in the list?", ar: 'هل يمكنني وصف شيء غير موجود في القائمة؟' }, answer: rt('Yes. Type your own words in the occasion, or choose "something else" and tell us on WhatsApp.', 'نعم. اكتب كلماتك في خانة المناسبة، أو اختر «شيء آخر» وأخبرنا عبر واتساب.') },
      ],
    },
    {
      blockType: 'callToAction',
      heading: { en: 'Ready when you are', ar: 'نحن جاهزون متى شئت' },
      body: { en: 'Describe your shoot above, or message us now.', ar: 'صِف التصوير في الأعلى، أو راسلنا الآن.' },
      primary: { label: { en: 'Start a brief', ar: 'ابدأ طلباً' }, kind: 'link', href: '#brief' },
      secondary: { label: { en: 'WhatsApp us', ar: 'راسلنا على واتساب' }, kind: 'whatsapp' },
    },
  ],
  seo: {
    title: { en: 'Shoot Project · Book a photographer in the UAE', ar: 'Shoot Project · احجز مصوّراً في الإمارات' },
    description: {
      en: 'Describe your shoot in one line and we reply on WhatsApp. Photographers and videographers across the UAE.',
      ar: 'صِف التصوير في سطر واحد ونردّ عليك عبر واتساب. مصوّرون ومصوّرو فيديو في جميع أنحاء الإمارات.',
    },
  },
}

/** Emirates and a few cities (research §9). Emirate slugs equal the brief builder's `locations` option values. */
export const locations: { slug: string; order: number; name: L; cities: { slug: string; name: L }[] }[] = [
  { slug: 'dubai', order: 1, name: { en: 'Dubai', ar: 'دبي' }, cities: [
    { slug: 'dubai-marina', name: { en: 'Dubai Marina', ar: 'دبي مارينا' } },
    { slug: 'jumeirah', name: { en: 'Jumeirah', ar: 'جميرا' } },
    { slug: 'downtown-dubai', name: { en: 'Downtown Dubai', ar: 'وسط مدينة دبي' } },
  ] },
  { slug: 'abu-dhabi', order: 2, name: { en: 'Abu Dhabi', ar: 'أبوظبي' }, cities: [
    { slug: 'al-ain', name: { en: 'Al Ain', ar: 'العين' } },
    { slug: 'yas-island', name: { en: 'Yas Island', ar: 'جزيرة ياس' } },
    { slug: 'saadiyat-island', name: { en: 'Saadiyat Island', ar: 'جزيرة السعديات' } },
  ] },
  { slug: 'sharjah', order: 3, name: { en: 'Sharjah', ar: 'الشارقة' }, cities: [{ slug: 'khor-fakkan', name: { en: 'Khor Fakkan', ar: 'خورفكان' } }] },
  { slug: 'ajman', order: 4, name: { en: 'Ajman', ar: 'عجمان' }, cities: [] },
  { slug: 'ras-al-khaimah', order: 5, name: { en: 'Ras Al Khaimah', ar: 'رأس الخيمة' }, cities: [] },
  { slug: 'fujairah', order: 6, name: { en: 'Fujairah', ar: 'الفجيرة' }, cities: [] },
  { slug: 'umm-al-quwain', order: 7, name: { en: 'Umm Al Quwain', ar: 'أم القيوين' }, cities: [] },
]
