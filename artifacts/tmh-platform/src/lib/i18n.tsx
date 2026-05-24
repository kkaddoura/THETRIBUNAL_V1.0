import { createContext, useContext, useState, useEffect, ReactNode } from "react"

type Lang = "en" | "ar"

interface I18nContextType {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: string) => string
  isAr: boolean
}

const I18nContext = createContext<I18nContextType>({
  lang: "en",
  setLang: () => {},
  t: (key: string) => key,
  isAr: false,
})

export function useI18n() {
  return useContext(I18nContext)
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("tmh-lang") as Lang) || "en"
    }
    return "en"
  })

  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem("tmh-lang", l)
  }

  useEffect(() => {
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr"
    document.documentElement.lang = lang
    if (lang === "ar") {
      document.documentElement.style.fontFamily = "'IBM Plex Sans Arabic', 'DM Sans', sans-serif"
    } else {
      document.documentElement.style.fontFamily = ""
    }
  }, [lang])

  const t = (key: string): string => {
    if (lang === "en") return key
    return AR[key] ?? key
  }

  return (
    <I18nContext.Provider value={{ lang, setLang, t, isAr: lang === "ar" }}>
      {children}
    </I18nContext.Provider>
  )
}

export function LangToggle({ className }: { className?: string }) {
  const { lang, setLang } = useI18n()

  return (
    <button
      onClick={() => setLang(lang === "en" ? "ar" : "en")}
      className={className}
      style={{
        fontFamily: lang === "en" ? "'IBM Plex Sans Arabic', sans-serif" : "'Barlow Condensed', sans-serif",
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: lang === "en" ? "0.05em" : "0.15em",
        textTransform: "uppercase",
        padding: "4px 10px",
        border: "1px solid rgba(128,128,128,0.3)",
        background: "transparent",
        cursor: "pointer",
        transition: "all 0.2s ease",
        lineHeight: 1.4,
      }}
      aria-label="Toggle language"
    >
      {lang === "en" ? "عربي" : "EN"}
    </button>
  )
}

const AR: Record<string, string> = {
  "About": "من نحن",
  "Pulse": "النبض",
  "Debates": "المناظرات",
  "Predictions": "التوقعات",
  "Voices": "الأصوات",
  "The Majlis": "المجلس",
  "Sign In": "تسجيل الدخول",
  "Sign Up": "إنشاء حساب",
  "Join The Voices": "انضم للأصوات",
  "The Weekly Newsletter": "النشرة الأسبوعية",
  "Apply to Be a Voice": "قدّم لتصبح صوتاً",
  "by The Middle East Hustle": "من ذا ميدل إيست هاسل",
  "The Region, On Record": "المنطقة، على السجل",
  "The questions people ": "الأسئلة التي ",
  "avoid": "يتجنبها الناس",
  " in public": " علناً",
  "Private voting on what the region really thinks about power, money, culture, work, media and the future.": "تصويت خاص حول ما تفكر فيه المنطقة فعلاً بشأن السلطة، المال، الثقافة، العمل، الإعلام والمستقبل.",
  "Your vote is private. The result is public.": "صوتك خاص. النتيجة علنية.",
  "Cast Your Vote": "صوّت الآن",
  "How It Works": "كيف تعمل",
  "Live Questions": "أسئلة مباشرة",
  "Countries Covered": "دول مغطاة",
  "+ Predictions": "+ توقعات",
  "Private": "خاص",
  "Voting": "تصويت",

  "TODAY'S LEAD DEBATE": "مناظرة اليوم الرئيسية",
  "Bold take.": "رأي جريء.",
  "LATEST DEBATES": "آخر المناظرات",
  "votes": "صوت",
  "CAST YOUR VOTE": "صوّت الآن",
  "LIVE": "مباشر",
  "WEIGH IN": "شارك رأيك",
  "View Full Debate →": "شوف المناظرة كاملة ←",
  "See All Debates →": "كل المناظرات ←",

  "Live Activity": "نشاط مباشر",
  "Someone from": "شخص من",
  "just voted on": "صوّت الآن على",

  "What will happen next? The region decides.": "شو اللي رح يصير؟ المنطقة تقرر.",
  "YES": "نعم",
  "NO": "لا",
  "predictions": "توقع",
  "Resolves": "ينتهي",
  "Explore All Predictions →": "كل التوقعات ←",

  "TRENDING IN MENA": "الأكثر رواجاً في المنطقة",
  "What's moving right now across the region.": "شو اللي عم يتحرك بالمنطقة هلق.",

  "Join 10,000+ Voices": "انضم لأكثر من ١٠,٠٠٠ صوت",
  "You're In": "أنت معنا",
  "Welcome to the conversation.": "أهلاً بالمحادثة.",
  "No spam. Unsubscribe anytime.": "بدون سبام. إلغاء الاشتراك بأي وقت.",
  "Your email": "بريدك الإلكتروني",
  "Subscribe": "اشترك",

  "The region, on record.": "المنطقة، على السجل.",
  "Stay Informed": "ابق على اطلاع",
  "Get the sharpest questions, results and prediction shifts from The Tribunal.": "احصل على أحدّ الأسئلة والنتائج وتحوّلات التوقعات من المحكمة.",
  "Learn More →": "← اعرف أكثر",
  "FAQ": "الأسئلة الشائعة",
  "Terms": "الشروط والأحكام",
  "Contact": "تواصل معنا",

  "The Pulse": "النبض",
  "What's Actually Happening in MENA": "شو عم يصير فعلاً بالمنطقة",
  "trends the region needs to confront. Updated quarterly.": "ترند لازم المنطقة تواجههم. يُحدّث كل ربع سنة.",
  "Trends": "ترندات",
  "Categories": "تصنيفات",
  "Countries": "دولة",
  "People": "شخص",
  "Live Counter": "عداد مباشر",
  "MENA Population Right Now": "سكان المنطقة الآن",
  "Growing by ~8.2 million per year — roughly 1 new person every 4 seconds. 60% are under 30.": "يزدادون ~٨.٢ مليون سنوياً — تقريباً شخص جديد كل ٤ ثواني. ٦٠٪ تحت الـ٣٠.",
  "Exploding Trends": "ترندات منفجرة",
  "Click any card for the full story": "اضغط على أي كرت للقصة كاملة",
  "All Trends": "كل الترندات",
  "Power & Politics": "السلطة والسياسة",
  "Money & Markets": "المال والأسواق",
  "Society & Identity": "المجتمع والهوية",
  "Tech & AI": "التكنولوجيا والذكاء الاصطناعي",
  "Survival & Crisis": "البقاء والأزمات",
  "Migration & Talent": "الهجرة والمواهب",
  "Culture & Religion": "الثقافة والدين",
  "Health & Youth": "الصحة والشباب",
  "Showing": "عرض",
  "of": "من",
  "trends": "ترند",
  "Clear filter": "إزالة الفلتر",

  "POWER": "سلطة",
  "MONEY": "مال",
  "SOCIETY": "مجتمع",
  "TECHNOLOGY": "تكنولوجيا",
  "SURVIVAL": "بقاء",
  "MIGRATION": "هجرة",
  "CULTURE": "ثقافة",
  "HEALTH": "صحة",
  "ENTERTAINMENT": "ترفيه",
  "DEMOGRAPHICS": "ديموغرافيا",
  "FINANCE": "مالية",
  "POLITICS": "سياسة",

  "Press Freedom Collapse": "انهيار حرية الصحافة",
  "Surveillance Tech Spending": "إنفاق تكنولوجيا المراقبة",
  "Political Detainees": "المعتقلين السياسيين",
  "Billionaire Wealth vs. GDP": "ثروة المليارديرات مقابل الناتج المحلي",
  "Cost of Living Crisis": "أزمة تكلفة المعيشة",
  "Crypto Trading Volume": "حجم تداول العملات الرقمية",
  "Sovereign Wealth Power": "قوة صناديق الثروة السيادية",
  "Women's Rights Gap": "فجوة حقوق المرأة",
  "Women in the Workforce": "المرأة في سوق العمل",
  "\"Honor\"-Based Violence": "العنف باسم \"الشرف\"",
  "LGBTQ+ Criminalization": "تجريم مجتمع الميم",
  "AI Adoption Rate": "نسبة تبني الذكاء الاصطناعي",
  "Internet Censorship": "الرقابة على الإنترنت",
  "MENA Gaming Market": "سوق الألعاب في المنطقة",
  "Water Scarcity Emergency": "طوارئ شحّ المياه",
  "Food Import Dependency": "الاعتماد على استيراد الغذاء",
  "Lethal Heat Threshold": "عتبة الحرارة القاتلة",
  "Displaced Populations": "السكان النازحين",
  "Kafala Sponsorship System": "نظام الكفالة",
  "MENA Brain Drain": "هجرة الأدمغة",
  "Nationalization vs. Expat Workforce": "التوطين مقابل العمالة الوافدة",
  "Sectarian Tension Index": "مؤشر التوترات الطائفية",
  "Religious Observance Decline": "تراجع الالتزام الديني",
  "Blasphemy & Apostasy Laws": "قوانين التجديف والردة",
  "MENA Creator Economy": "اقتصاد صناع المحتوى",
  "Mental Health Search Volume": "حجم البحث عن الصحة النفسية",
  "Youth Unemployment": "بطالة الشباب",
  "Population Under 30": "السكان تحت الـ٣٠",
  "Child Marriage Rate": "نسبة زواج الأطفال",
  "Oil Revenue Dependency": "الاعتماد على عائدات النفط",
  "Sportswashing Spending": "إنفاق الغسيل الرياضي",
  "Arab-Israel Normalization": "التطبيع العربي الإسرائيلي",
  "Tobacco & Vaping Epidemic": "وباء التدخين والفيب",
  "Cannabis Reform Momentum": "زخم إصلاح الحشيش",
  "Saudi Tourism Revolution": "ثورة السياحة السعودية",
  "Domestic Worker Abuse": "إساءة معاملة العمالة المنزلية",

  "Not Free": "غير حرة",
  "Across MENA": "عبر المنطقة",
  "Peak 2024": "ذروة ٢٠٢٤",
  "Since 2021": "منذ ٢٠٢١",
  "WEF ranking": "تصنيف المنتدى الاقتصادي",
  "Underreported": "غير مُبلَّغ عنه",
  "Death penalty in 6": "عقوبة إعدام في ٦ دول",
  "Below crisis threshold": "تحت عتبة الأزمة",
  "Zero change": "بدون تغيير",
  "Uninhabitable by 2060": "غير صالحة للسكن بحلول ٢٠٦٠",
  "Refugees + IDPs": "لاجئين + نازحين",
  "Reforms stalling": "الإصلاحات متوقفة",
  "Accelerating": "يتسارع",
  "Sunni–Shia fault line": "خط الصدع السني-الشيعي",
  "Before age 18": "قبل سن الـ١٨",
  "Target: 50% by 2030": "الهدف: ٥٠٪ بحلول ٢٠٣٠",
  "Saudi deal pending": "صفقة السعودية معلقة",
  "Minimal protections": "حماية ضئيلة",
  "Morocco, Lebanon, Tunisia": "المغرب، لبنان، تونس",
  "Highest globally": "الأعلى عالمياً",
  "Worst region globally": "أسوأ منطقة عالمياً",
  "+62% since 2021": "+٦٢٪ منذ ٢٠٢١",
  "+41%": "+٤١٪",
  "+74%": "+٧٤٪",
  "+18%": "+١٨٪",
  "+9.2pp since 2019": "+٩.٢ نقطة مئوية منذ ٢٠١٩",
  "+3 since 2022": "+٣ منذ ٢٠٢٢",
  "+29%": "+٢٩٪",
  "+31% YoY": "+٣١٪ سنوياً",
  "+312% since 2019": "+٣١٢٪ منذ ٢٠١٩",
  "+76% since 2020": "+٧٦٪ منذ ٢٠٢٠",
  "70% of Gulf GDP": "٧٠٪ من ناتج الخليج",
  "4 Abraham Accords": "٤ اتفاقيات إبراهيم",
  "1 in 5 girls": "١ من كل ٥ بنات",
  "150K+ per year": "+١٥٠ ألف سنوياً",
  "23M workers affected": "٢٣ مليون عامل متأثر",
  "7 active conflicts": "٧ نزاعات نشطة",
  "18% drop under-35": "انخفاض ١٨٪ تحت الـ٣٥",
  "60% of population": "٦٠٪ من السكان",
  "56°C recorded": "٥٦ درجة مسجلة",
  "85% imported": "٨٥٪ مستورد",
  "30% youth rate": "٣٠٪ بين الشباب",
  "$1.2B market": "سوق بقيمة ١.٢ مليار دولار",
  "$75B+ invested": "+٧٥ مليار دولار استثمار",
  "100M visitors by 2030": "١٠٠ مليون زائر بحلول ٢٠٣٠",

  "Est. 2026 · The Tribunal": "تأسست ٢٠٢٦ · المحكمة",
  "A place to say what people": "مكان لقول ما الناس",
  "usually keep private": "عادةً ما يبقونه خاصاً",
  "The Tribunal asks direct questions about the region and shows how people answer privately.": "المحكمة تطرح أسئلة مباشرة عن المنطقة وتُظهر كيف يجيب الناس بشكل خاص.",
  "No names attached. No public performance. Just the result.": "بدون أسماء. بدون عرض علني. النتيجة فقط.",
  "What is The Tribunal?": "ما هي المحكمة؟",
  "The Tribunal is a private voting platform for the Middle East and North Africa.": "المحكمة منصة تصويت خاصة للشرق الأوسط وشمال أفريقيا.",
  "We ask the questions people usually avoid in public. People vote privately. The results are shown publicly.": "نطرح الأسئلة التي يتجنبها الناس عادةً علناً. الناس يصوّتون بشكل خاص. النتائج تُعرض علناً.",
  "It is not a news site.": "ليست موقع أخبار.",
  "It is not a think tank.": "ليست مركز أبحاث.",
  "It is not a comment section.": "ليست قسم تعليقات.",
  "It is a record of what people actually think when their names are not attached.": "هي سجل لما يفكر فيه الناس فعلاً عندما لا تُربط أسماؤهم بآرائهم.",
  "Private does not mean fake. If it is not human, it does not count.": "خاص لا يعني مزيّفاً. إذا لم يكن إنساناً، لا يُحتسب.",
  "You can vote without creating an account. If you sign up, you can save your activity, view previous votes and predictions, and continue from another device.": "يمكنك التصويت دون إنشاء حساب. إذا سجّلت، يمكنك حفظ نشاطك ومشاهدة أصواتك وتوقعاتك السابقة والمتابعة من جهاز آخر.",
  "What is the Share Gate?": "ما هو Share Gate؟",

  "Frequently Asked Questions": "الأسئلة الشائعة",
  "Plain answers about The Tribunal.": "إجابات واضحة عن المحكمة.",
  "Help": "مساعدة",

  "The Platform": "المنصة",


  "Enter the Debates": "ادخل المناظرات",
  "Make a Prediction": "سجّل توقع",
  "Read The Pulse": "اقرأ النبض",
  "Meet The Voices": "تعرّف على الأصوات",


  "Founding Voices": "أصوات مؤسسة",
  "Active Debates": "مناظرات نشطة",
  "MENA Countries": "دول المنطقة",
  "People in MENA": "سكان المنطقة",

  "From the Founder": "من المؤسس",
  "This started with a question I kept asking in private rooms:": "بدأت بسؤال كنت دائماً أطرحه في غرف خاصة:",
  "What does the region actually think?": "ماذا تفكر المنطقة فعلاً؟",
  "Not what people say in public.": "ليس ما يقوله الناس علناً.",
  "Not what people post for approval.": "ليس ما ينشره الناس للاستحسان.",
  "Not what leaders claim.": "ليس ما يدّعيه القادة.",
  "Not what outsiders assume.": "ليس ما يفترضه الغرباء.",
  "What people actually think.": "ما يفكر فيه الناس فعلاً.",
  "The Tribunal does not speak for the region. It records what people say when they can answer honestly.": "المحكمة لا تتحدث باسم المنطقة. هي تسجّل ما يقوله الناس عندما يستطيعون الإجابة بصدق.",
  "People do not lack opinions. They lack a place to say them honestly.": "الناس لا تنقصهم الآراء. ينقصهم مكان للتعبير عنها بصدق.",
  "— Kareem Kaddoura, Founder": "— كريم قدورة، المؤسس",

  "What We Stand For": "ما نؤمن به",
  "Ask directly": "اسأل مباشرة",
  "Soft questions produce soft answers.": "الأسئلة الرخوة تنتج أجوبة رخوة.",
  "Do not answer for people": "لا تجب نيابةً عن الناس",
  "The Tribunal asks the question. People decide the result.": "المحكمة تطرح السؤال. الناس تقرر النتيجة.",
  "Keep votes private": "أبقِ الأصوات خاصة",
  "Your name is not shown with your vote.": "اسمك لا يُعرض مع صوتك.",
  "Show the result publicly": "اعرض النتيجة علناً",
  "The value is in the aggregate.": "القيمة في المجموع.",
  "Let people save their own record": "دع الناس يحفظون سجلهم",
  "If someone signs up, they can view their previous activity and return to it later.": "إذا سجّل أحدهم، يمكنه عرض نشاطه السابق والعودة إليه لاحقاً.",
  "Count people, not noise": "أحصِ الناس، لا الضجيج",
  "No bots. No sponsored sentiment. No manufactured consensus.": "بدون بوتات. بدون آراء ممولة. بدون إجماع مصطنع.",

  "The Region We Cover": "المنطقة التي نغطيها",
  "19 countries. One regional lens.": "١٩ دولة. عدسة واحدة للمنطقة.",

  "Egypt": "مصر",
  "Iran": "إيران",
  "Iraq": "العراق",
  "Saudi Arabia": "السعودية",
  "Morocco": "المغرب",
  "Algeria": "الجزائر",
  "Sudan": "السودان",
  "Yemen": "اليمن",
  "Syria": "سوريا",
  "UAE": "الإمارات",
  "Jordan": "الأردن",
  "Tunisia": "تونس",
  "Libya": "ليبيا",
  "Lebanon": "لبنان",
  "Palestine": "فلسطين",
  "Oman": "عمان",
  "Kuwait": "الكويت",
  "Qatar": "قطر",
  "Bahrain": "البحرين",

  "See where you stand.": "اعرف أين تقف.",
  "Vote privately. See the result publicly.": "صوّت بشكل خاص. شاهد النتيجة علناً.",
  "Enter The Majlis": "ادخل المجلس",

  "Is The Tribunal free to use?": "هل المحكمة مجانية؟",
  "Who is behind The Tribunal?": "مَن وراء المحكمة؟",
  "Are the results scientific?": "هل النتائج علمية؟",
  "Do I need an account?": "هل أحتاج إلى حساب؟",

  "How do the debates work?": "كيف تشتغل المناظرات؟",
  "Can I vote more than once?": "فيني صوّت أكتر من مرة؟",
  "How are debate questions chosen?": "كيف بيتم اختيار أسئلة المناظرات؟",

  "What is the Predictions page?": "شو هي صفحة التوقعات؟",
  "How do predictions work?": "كيف تشتغل التوقعات؟",

  "What is The Pulse?": "شو هو النبض؟",
  "How are Pulse trends selected?": "كيف بيتم اختيار ترندات النبض؟",

  "The Voices": "الأصوات",
  "What is a Voice?": "شو يعني \"صوت\"؟",
  "How do I become a Voice?": "كيف بصير \"صوت\"؟",

  "Privacy & Data": "الخصوصية والبيانات",
  "What data do you collect?": "شو البيانات اللي بتجمعوها؟",
  "Do you track my IP address?": "بتتبعوا عنوان الـIP تبعي؟",
  "Where does the country data in results come from?": "من وين بتيجي بيانات الدول بالنتائج؟",
  "Still have questions?": "عندك أسئلة تانية؟",
  "About The Tribunal →": "← عن المحكمة",
  "Apply to be a Voice →": "← قدّم طلب لتصير صوت",
  "Terms & Conditions →": "← الشروط والأحكام",

  "Legal": "قانوني",
  "Terms & Conditions": "الشروط والأحكام",
  "Last updated: May 2026": "آخر تحديث: مايو ٢٠٢٦",

  "103 VOICES": "١٠٣ صوت",
  "Search voices by name, company, or country...": "ابحث عن الأصوات بالاسم أو الشركة أو البلد...",
  "All Countries": "كل الدول",
  "All Sectors": "كل القطاعات",

  "Think You Belong In The Voices?": "بتحس إنك لازم تكون من الأصوات؟",
  "Apply Now →": "← قدّم الآن",

  "Welcome to The Tribunal": "أهلاً بالمحكمة",
  "You've just unlocked something real.": "لقد فتحت شيئاً حقيقياً.",

  "Source:": "المصدر:",

  "Latest Debates": "آخر المناظرات",
  "This Week's Debates": "مناظرات هالأسبوع",
  "View All": "شوف الكل",
  "View All Debates": "كل المناظرات",
  "What Do You Think Actually Happens?": "شو بتتوقع فعلاً يصير؟",
  "Not what should happen. What will.": "مش شو لازم يصير. شو رح يصير.",
  "predictions locked in": "توقع مسجّل",
  "Yes": "نعم",
  "No": "لا",
  "Lock In Your Prediction →": "← سجّل توقعك",
  "View All →": "← شوف الكل",
  "Curated profiles of people with a clear connection to the region and a body of work we can verify.": "ملفات تعريفية منتقاة لأشخاص مرتبطين بالمنطقة من خلال أعمالهم ومواقفهم.",
  "View All Voices": "كل الأصوات",
  "Explore Topics": "استكشف المواضيع",
  "Live activity map": "خريطة النشاط المباشر",
  "Join The Hustle": "انضم للهاسل",
  "your@email.com": "your@email.com",
}
