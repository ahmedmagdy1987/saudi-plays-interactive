/* ============================================================================
   السعودية تلعب — Centralized content & data layer (single source of truth)
   ----------------------------------------------------------------------------
   Canonical project name: «السعودية تلعب» (never «المملكة تلعب»).
   Presented by ملاهي, in collaboration with الهيئة العامة للترفيه and national
   stakeholders.

   RULES ENCODED HERE:
   • The Riyadh figures are a PROVEN PILOT (2024–2025), not national results.
   • Rollout 5 → 10 → 20+ are CUMULATIVE coverage numbers (not additive).
   • Market figures are INTERNAL ESTIMATES (carry the source note).
   • Operations-dashboard numbers are a DEMONSTRATIVE interface example.
   • Revenue percentages are exact and total 100.
   • KPI/impact values are TARGETS / projected impact, never achievements.

   Edit numbers/copy here only — nothing important should live in components.
   ========================================================================== */

export interface Stat {
  prefix?: string;
  value: number;
  suffix?: string;
  decimals?: number;
  /** verbatim display string when count-up is disabled / reduced motion */
  display: string;
  label: string;
  sub?: string;
}

export interface Force {
  id: string;
  ar: string;
  en: string;
  desc: string;
}

export const SOURCE_NOTE_ESTIMATE = "مؤشرات تقديرية — تجميع داخلي ملاهي 2026";

export const brand = {
  name: "السعودية تلعب",
  nameLatin: "Saudi Plays",
  presenter: "ملاهي",
  presenterLatin: "Malahi",
  collaboration:
    "تقدّمها ملاهي بالتعاون مع الهيئة العامة للترفيه وعدد من الجهات الوطنية",
  tagline: "منصة وطنية للترفيه المجتمعي",
} as const;

/* ---- Section meta (drives the progress navigation) ---------------------- */
export const NAV = [
  { id: "intro", index: "01", label: "الافتتاحية", en: "Opening" },
  { id: "vision", index: "02", label: "الرؤية الوطنية", en: "Vision" },
  { id: "market", index: "03", label: "حجم الفرصة", en: "Market" },
  { id: "riyadh", index: "04", label: "من الرياض للمملكة", en: "Rollout" },
  { id: "zones", index: "05", label: "مناطق التجربة", en: "Zones" },
  { id: "malahi", index: "06", label: "منظومة ملاهي", en: "Platform" },
  { id: "governance", index: "07", label: "الحوكمة والشراكات", en: "Governance" },
  { id: "revenue", index: "08", label: "نموذج الإيرادات", en: "Revenue" },
  { id: "impact", index: "09", label: "المستهدفات والأثر", en: "Impact" },
  { id: "finale", index: "10", label: "لماذا ملاهي", en: "Finale" },
] as const;

/* ============================ 01 — OPENING ================================ */
export const hero = {
  eyebrow: "SAUDI PLAYS · NATIONAL ENTERTAINMENT PLATFORM",
  titleLines: ["السعودية", "تلعب"],
  supporting: "معًا نصنع تجربة ترفيهية وطنية تصل إلى كل مدينة وكل حي",
  caseStudyTag: "تجربة «الرياض تلعب» · 2024–2025",
  caseStudyNote:
    "أرقام تجربة «الرياض تلعب» — مرحلة تجريبية مُثبتة، وليست أرقامًا وطنية.",
  stats: [
    { prefix: "+", value: 100, suffix: "K", display: "+100K", label: "مشارك" },
    { prefix: "+", value: 200, suffix: "", display: "+200", label: "فعالية وتجربة" },
    { prefix: "+", value: 50, suffix: "", display: "+50", label: "موقع تشغيل" },
  ] as Stat[],
};

/* ============================ 02 — VISION ================================= */
export const vision = {
  eyebrow: "WHY NOW · لماذا الآن",
  headline: "الترفيه للجميع، في كل مدينة، وكل حي",
  sub: "طموح وطني يتوسّع نحو أكثر من 20 مدينة، شبكة ترفيهية واحدة تنبض من الرياض إلى أطراف المملكة.",
  convergeStatement: "أربع قوى تلتقي عند منصة واحدة: السعودية تلعب.",
  forces: [
    {
      id: "v2030",
      ar: "رؤية المملكة 2030",
      en: "Vision 2030",
      desc: "الترفيه ركيزة في جودة الحياة ومستهدف وطني نعمل على خدمته.",
    },
    {
      id: "growth",
      ar: "نمو قطاع الترفيه",
      en: "Sector Growth",
      desc: "قطاع يتوسّع بسرعة وتتنوّع تجاربه عبر مدن المملكة.",
    },
    {
      id: "tourism",
      ar: "السياحة الداخلية",
      en: "Domestic Tourism",
      desc: "حركة داخلية متصاعدة تبحث عن وجهات وتجارب قريبة.",
    },
    {
      id: "demand",
      ar: "الطلب المجتمعي",
      en: "Community Demand",
      desc: "مجتمع شاب يطلب ترفيهًا محليًا آمنًا ومتجددًا.",
    },
  ] as Force[],
};

/* ============================ 03 — MARKET ================================= */
export const market = {
  eyebrow: "MARKET OPPORTUNITY · حجم الفرصة",
  headline: "سوق شاب، وطلب متسارع",
  sub: "مؤشرات السوق المحلي تكشف عن قاعدة سكانية شابة وطلب متنامٍ على الترفيه القريب.",
  sourceNote: SOURCE_NOTE_ESTIMATE,
  figures: [
    { value: 32, suffix: "M", display: "32M", label: "نحو 32 مليون نسمة", sub: "حجم السوق المحلي" },
    { value: 63, suffix: "%", display: "63%", label: "تحت سن 35 سنة", sub: "قاعدة سكانية شابة" },
    { prefix: "+", value: 12, suffix: "M", display: "+12M", label: "زيارة سنوية", sub: "للمرافق والوجهات الترفيهية" },
  ] as Stat[],
  growthLabel: "نمو متسارع في الطلب على الترفيه المحلي",
  // honest two-segment population split (only the supplied 63% under-35 figure)
  youthSplit: [
    { id: "under35", label: "تحت 35 سنة", value: 63, accent: "teal" },
    { id: "over35", label: "35 سنة فأكثر", value: 37, accent: "violet" },
  ],
  // illustrative rising demand trend (clearly labeled, not a measured dataset)
  demandTrend: {
    label: "اتجاه الطلب على الترفيه المحلي",
    caption: "منحنى توضيحي لاتجاه الطلب",
    points: [18, 26, 31, 40, 52, 63, 78, 92],
  },
};

/* ======================= 04 — RIYADH → KINGDOM =========================== */
export const riyadhToSaudi = {
  eyebrow: "FROM RIYADH TO THE KINGDOM",
  title: "من التجربة إلى الواقع",
  sub: "تجربة «الرياض تلعب» أثبتت النموذج. الآن نوسّعه إلى شبكة وطنية.",
  proofPoints: [
    {
      id: "safe",
      ar: "تشغيل عائلي آمن وعالي الجودة",
      desc: "في الفضاءات الحضرية المفتوحة، بمعايير أمن وسلامة عالية.",
    },
    {
      id: "multi",
      ar: "تجارب متعددة الفئات",
      desc: "للأطفال والشباب والعائلات في وجهة واحدة.",
    },
    {
      id: "digital",
      ar: "أنظمة دفع وتشغيل متكاملة",
      desc: "مدفوعات رقمية وتشغيل مُدار بالكامل.",
    },
  ],
  // centralized rollout values — change here if pilot dates are confirmed
  cumulativeNote: "أرقام 5 و10 و20+ تمثّل تغطية تراكمية عبر السنوات، ولا تُجمع.",
  timeline: [
    { id: "pilot", period: "2024–2025", year: "2024–2025", title: "الرياض — المرحلة التجريبية", cities: "1", cumulative: 1, kind: "proven" as const, note: "أساس مُثبت" },
    { id: "y1", period: "السنة الأولى", year: "2026", title: "خمس مدن", cities: "5", cumulative: 5, kind: "target" as const },
    { id: "y2", period: "السنة الثانية", year: "2027", title: "عشر مدن", cities: "10", cumulative: 10, kind: "target" as const },
    { id: "y3", period: "السنة الثالثة", year: "2028", title: "أكثر من 20 مدينة", cities: "20+", cumulative: 20, kind: "target" as const },
  ],
  firstCities: ["الرياض", "جدة", "الدمام", "مكة المكرمة", "المدينة المنورة"],
};

/* ======================= 05 — EXPERIENCE ZONES =========================== */
export const experience = {
  eyebrow: "THE DESTINATION · التجربة",
  coreTitle: "السعودية تلعب",
  coreSub: "نواة حيّة تتفرّع منها الجماهير وفئات التجربة.",
  audiences: [
    { id: "games", ar: "الألعاب" },
    { id: "sports", ar: "الرياضات" },
    { id: "challenges", ar: "التحديات" },
    { id: "family", ar: "العائلة" },
    { id: "kids", ar: "الأطفال" },
    { id: "digital", ar: "التجارب الرقمية" },
  ],
  zonesTitle: "خمس مناطق تجربة رئيسية",
  zonesSub: "خمس مناطق، وجهة واحدة متصلة.",
  zones: [
    {
      id: "digital",
      ar: "المنطقة الرقمية",
      en: "Digital Zone",
      icon: "digital",
      accent: "violet",
      desc: "تجارب تفاعلية وألعاب رقمية وواقع ممتد يجمع بين اللعب والتقنية.",
    },
    {
      id: "sports",
      ar: "المنطقة الرياضية",
      en: "Sports Zone",
      icon: "sports",
      accent: "teal",
      desc: "ملاعب وتحديات حركية ومنافسات جماعية لكل المستويات.",
    },
    {
      id: "challenge",
      ar: "منطقة التحدي",
      en: "Challenge Zone",
      icon: "challenge",
      accent: "gold",
      desc: "مهمات ومسارات مهارة تختبر الجرأة والذكاء والعمل الجماعي.",
    },
    {
      id: "kids",
      ar: "منطقة الأطفال",
      en: "Kids Zone",
      icon: "kids",
      accent: "teal",
      desc: "عالم آمن وتعليمي يحفّز الخيال في بيئة مصممة للصغار.",
    },
    {
      id: "family",
      ar: "منطقة العائلة",
      en: "Family Zone",
      icon: "family",
      accent: "violet",
      desc: "مساحات تجمع كل الأجيال في تجربة واحدة لا تُنسى.",
    },
  ],
};

/* ===================== 06 — MALAHI OS + TECHNOLOGY ======================= */
export const malahi = {
  eyebrow: "MALAHI OS · منظومة التشغيل والتقنية",
  title: "منظومة تشغيل وتقنية متكاملة",
  sub: "خمس ركائز تشغيلية تُدار بمنصة تقنية واحدة.",
  pillars: [
    { id: "ops", ar: "التشغيل", proof: "+50 موقع تشغيل في سياق التجربة", icon: "ops" },
    { id: "tech", ar: "التقنية", proof: "دعم تقني على مدار الساعة 24/7", icon: "tech" },
    { id: "content", ar: "المحتوى", proof: "منظومة محتوى ومورّدين قابلة للتوسّع", icon: "content" },
    { id: "pay", ar: "المدفوعات", proof: "مدفوعات رقمية 100%", icon: "pay" },
    { id: "monitor", ar: "المراقبة", proof: "مراقبة تشغيلية حيّة ومباشرة", icon: "monitor" },
  ],
  platformTitle: "منصة التقنية",
  platform: [
    { id: "rpay", ar: "RPay", desc: "نظام مدفوعات رقمي موحّد." },
    { id: "remote", ar: "تشغيل الأجهزة عن بُعد", desc: "إدارة وتشغيل المعدّات عن بُعد." },
    { id: "analytics", ar: "التحليلات", desc: "بيانات لحظية لدعم القرار." },
    { id: "dashboard", ar: "لوحة الإدارة", desc: "تحكّم مركزي في المواقع والتجارب." },
    { id: "monitoring", ar: "مراقبة حيّة 24/7", desc: "متابعة تشغيلية مستمرة." },
  ],
  dashboard: {
    label: "نموذج توضيحي للوحة العمليات",
    disclaimer: "أرقام واجهة توضيحية لغرض العرض — وليست نتائج تشغيل فعلية.",
    metrics: {
      uptime: { value: 85.9, suffix: "%", label: "جاهزية التشغيل", en: "Uptime" },
      sessions: { value: 3612, label: "الجلسات", en: "Sessions" },
      visitors: { value: 1284, label: "الزوار", en: "Visitors" },
      locations: { value: 14, total: 15, label: "المواقع النشطة", en: "Active locations" },
    },
    // demonstrative live series for the moving sparkline
    series: [42, 55, 48, 63, 71, 66, 78, 74, 83, 79, 88, 92],
    locationsList: [
      { id: "r1", ar: "الرياض · النخيل", status: "live" },
      { id: "r2", ar: "الرياض · الواجهة", status: "live" },
      { id: "j1", ar: "جدة · الكورنيش", status: "live" },
      { id: "d1", ar: "الدمام · الشاطئ", status: "live" },
      { id: "m1", ar: "مكة · الواجهة", status: "warn" },
      { id: "md1", ar: "المدينة · المركز", status: "live" },
    ],
  },
};

/* ===================== 07 — GOVERNANCE & PARTNERS ======================== */
export const governance = {
  eyebrow: "OPERATING MODEL · الحوكمة والشراكات",
  title: "منظومة تشغيل وطنية واضحة الأدوار",
  sub: "من التنظيم إلى التشغيل إلى المستفيد — كل طرف يعرف دوره في الشبكة.",
  // layer drives the animated build-up order & vertical placement
  entities: [
    { id: "gea", ar: "الهيئة العامة للترفيه", role: "المنظّم والسياسات", layer: "regulator" as const },
    { id: "malahi", ar: "ملاهي", role: "المشغّل الحصري", layer: "operator" as const },
    { id: "municipal", ar: "الأمانات والبلديات", role: "المواقع", layer: "enabler" as const },
    { id: "sponsors", ar: "الرعاة والشركاء", role: "الدعم والتفعيل", layer: "partner" as const },
    { id: "investors", ar: "المستثمرون", role: "التمويل والنمو", layer: "partner" as const },
    { id: "strategic", ar: "الشركاء الاستراتيجيون", role: "التكامل الوطني", layer: "partner" as const },
    { id: "developers", ar: "المطورون", role: "البنية والتطوير", layer: "partner" as const },
    { id: "qol", ar: "برنامج جودة الحياة", role: "التوافق مع المستهدفات", layer: "program" as const },
    { id: "beneficiary", ar: "المستفيد النهائي", role: "الزائر والمجتمع", layer: "beneficiary" as const },
  ],
  alignment: [
    { id: "entertainment", ar: "الترفيه" },
    { id: "culture", ar: "الثقافة" },
    { id: "sport", ar: "الرياضة" },
    { id: "society", ar: "المجتمع" },
    { id: "tourism", ar: "السياحة" },
  ],
};

/* ============================ 08 — REVENUE =============================== */
export const revenue = {
  eyebrow: "REVENUE MODEL · نموذج الإيرادات",
  title: "منظومة إيرادات متوازنة",
  sub: "ست قنوات إيراد تتكامل حول نواة واحدة — بمجموع 100%.",
  // exact percentages — must total 100; never altered by rounding/animation
  streams: [
    { id: "sponsor", ar: "الرعاية", pct: 30, accent: "teal", desc: "تفعيل الرعاة والعلامات داخل التجربة." },
    { id: "games", ar: "إيرادات الألعاب", pct: 25, accent: "violet", desc: "الألعاب والتجارب التفاعلية." },
    { id: "tickets", ar: "التذاكر", pct: 15, accent: "gold", desc: "الدخول والباقات." },
    { id: "fnb", ar: "المأكولات والمشروبات", pct: 12, accent: "teal", desc: "الضيافة والمطاعم." },
    { id: "naming", ar: "حقوق التسمية", pct: 10, accent: "violet", desc: "تسمية المناطق والمواقع." },
    { id: "ads", ar: "الإعلانات", pct: 8, accent: "gold", desc: "المساحات والمخزون الإعلاني." },
  ],
};

/* ====================== 09 — KPIs & NATIONAL IMPACT ===================== */
export const impact = {
  eyebrow: "TARGETS & IMPACT · المستهدفات والأثر",
  title: "مستهدفات وطنية وأثر متوقع",
  sub: "أرقام مستهدفة وأثر متوقع خلال ثلاث سنوات — وليست نتائج محققة.",
  targetLabel: "المستهدف",
  projectedLabel: "الأثر المتوقع",
  horizonLabel: "خلال 3 سنوات",
  targets: [
    { prefix: "+", value: 100, suffix: "", display: "+100", label: "موقع تشغيل مستهدف", sub: "عبر المملكة" },
    { value: 4.7, decimals: 1, suffix: "/5", display: "4.7/5", label: "رضا الزوار" },
    { value: 4, suffix: "×", display: "4×", label: "نمو الإيرادات" },
    { value: 85, suffix: "%", display: "85%", label: "معدل التفاعل" },
    { prefix: "+", value: 3, suffix: "M", display: "+3M", label: "زائر سنويًا" },
  ] as Stat[],
  cumulative3y: [
    { prefix: "+", value: 600, suffix: "", display: "+600", label: "فعالية منفّذة" },
    { prefix: "+", value: 8, suffix: "M", display: "+8M", label: "مشارك تراكمي" },
    { prefix: "+", value: 5000, suffix: "", display: "+5,000", label: "فرصة عمل مباشرة وغير مباشرة" },
  ] as Stat[],
  categories: [
    { id: "economy", ar: "الاقتصاد", desc: "إيرادات ووظائف وسلاسل قيمة محلية." },
    { id: "tourism", ar: "السياحة", desc: "وجهات تجذب الزيارة الداخلية." },
    { id: "qol", ar: "جودة الحياة", desc: "تجارب ترفيهية قريبة لكل أسرة." },
    { id: "society", ar: "المجتمع", desc: "مساحات آمنة تجمع المجتمع." },
    { id: "youth", ar: "الشباب", desc: "فرص ومحتوى يلامس جيلًا شابًا." },
  ],
};

/* ===================== 10 — WHY MALAHI / FINALE ========================= */
export const finale = {
  eyebrow: "WHY MALAHI · لماذا ملاهي",
  title: "لماذا ملاهي",
  sub: "خمس نقاط قوة استراتيجية تجعل ملاهي الشريك الأقدر على التنفيذ الوطني.",
  strengths: [
    { id: "biggest", ar: "المشغل الأكبر للترفيه", desc: "خبرة تشغيلية واسعة في إدارة الوجهات والتجارب الترفيهية." },
    { id: "national", ar: "تغطية وطنية", desc: "قدرة على الوصول والتوسّع من الرياض إلى مدن المملكة." },
    { id: "tech", ar: "قيادة تقنية", desc: "منصة تقنية موحّدة للمدفوعات والتشغيل والتحليلات." },
    { id: "excellence", ar: "تميز تشغيلي", desc: "معايير جودة وسلامة عالية ومراقبة تشغيلية مستمرة." },
    { id: "partners", ar: "شراكات استراتيجية", desc: "تكامل مع الجهات الوطنية والرعاة والمطورين." },
  ],
  finaleTitle: "السعودية تلعب",
  finaleStatement:
    "منصة وطنية للترفيه المجتمعي تعزز جودة الحياة وتدعم مستهدفات رؤية المملكة 2030",
};

export const footer = {
  presentedBy: "تقدّمها ملاهي",
  collaboration: "بالتعاون مع الهيئة العامة للترفيه وعدد من الجهات الوطنية",
  // text labels only — official logos are used solely when supplied as assets
  entities: [
    "الهيئة العامة للترفيه",
    "ملاهي",
    "برنامج جودة الحياة",
    "الأمانات والبلديات",
  ],
  logoNote: "تُعرض الجهات كعناوين نصية حيث لم تُورَّد ملفات الشعارات الرسمية.",
  rights:
    "© 2026 السعودية تلعب — مادة عرض. الأرقام والمستهدفات لأغراض العرض ما لم يُذكر خلاف ذلك.",
};

export const content = {
  brand,
  hero,
  vision,
  market,
  riyadhToSaudi,
  experience,
  malahi,
  governance,
  revenue,
  impact,
  finale,
  footer,
  NAV,
};

export default content;
