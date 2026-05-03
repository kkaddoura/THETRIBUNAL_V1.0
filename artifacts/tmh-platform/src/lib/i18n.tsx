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
  "Join The Voices": "انضم للأصوات",
  "The Weekly Newsletter": "النشرة الأسبوعية",
  "Apply to Be a Voice": "قدّم لتصبح صوتاً",
  "by The Middle East Hustle": "من ذا ميدل إيست هاسل",
  "Opinion of Record": "رأي للتاريخ",
  "The voice of": "صوت",
  "EST. 2026 · ISSUE NO. 001": "تأسست ٢٠٢٦ · العدد ٠٠١",
  "(MENA population growing at ~8.2 million per year — roughly 1 new person every 4 seconds)": "(سكان المنطقة يزدادون ~٨.٢ مليون سنوياً — تقريباً شخص جديد كل ٤ ثواني)",

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

  "The voice of 541 million. Real people. Real hustle. Real change.": "صوت ٥٤١ مليون. ناس حقيقيين. طموح حقيقي. تغيير حقيقي.",
  "Stay Informed": "ابق على اطلاع",
  "The questions no one else asks. The data no one else collects. Straight to your inbox.": "الأسئلة اللي ما حدا بيسألها. البيانات اللي ما حدا بيجمعها. مباشرة لبريدك.",
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

  "Est. 2026 · Founded by Kareem Kaddoura": "تأسست ٢٠٢٦ · أسسها كريم قدورة",
  "The Region's First Collective Mirror": "أول مرآة جماعية في المنطقة",
  "541 million people. Zero platforms asking what they think. Until now.": "٥٤١ مليون شخص. ولا منصة سألتهم رأيهم. لحد هلق.",
  "What Is The Tribunal?": "شو هي المحكمة؟",

  "Frequently Asked Questions": "الأسئلة الشائعة",
  "Everything you need to know about The Tribunal.": "كل شي لازم تعرفه عن المحكمة.",
  "Help": "مساعدة",

  "The Platform": "المنصة",

  "The Tribunal is MENA's first opinion intelligence platform — part editorial, part data engine, part social experiment. A product by The Middle East Hustle.": "المحكمة هي أول منصة ذكاء رأي بالمنطقة — جزء تحريري، جزء محرك بيانات، جزء تجربة اجتماعية. منتج من ذا ميدل إيست هاسل.",
  "We ask the questions nobody else asks. We collect anonymous votes from around the world on 19 MENA countries. We track predictions over time. We surface the trends reshaping the region. And we profile the people building it.": "نسأل الأسئلة اللي ما حدا بيسألها. نجمع أصوات مجهولة من حول العالم عن ١٩ دولة في منطقة الشرق الأوسط وشمال أفريقيا. نتتبع التوقعات عبر الوقت. نظهر الترندات اللي عم تغيّر المنطقة. ونعرّف بالناس اللي عم يبنوها.",
  "Think of it as the WSJ of MENA opinion — editorial in presentation, ruthlessly neutral in methodology, and built for the 541 million people who live, work, and build in the Middle East and North Africa.": "فكّر فيها كـ WSJ لرأي المنطقة — تحريرية بالعرض، محايدة بالمنهجية، ومبنية لـ ٥٤١ مليون شخص اللي عايشين وشغالين وبانين بالشرق الأوسط وشمال أفريقيا.",
  "Everything on The Tribunal — every debate, every prediction, every trend, every Voice — adds to a living dataset of what the region actually thinks. Not what governments report. Not what Western media assumes. What real people vote for when nobody's watching.": "كل شي على المحكمة — كل مناظرة، كل توقع، كل ترند، كل صوت — بيضيف لداتاسيت حيّة عن شو المنطقة فعلاً بتفكر. مش شو الحكومات بتقول. مش شو الإعلام الغربي بيفترض. شو الناس الحقيقيين بيصوتوا لما ما حدا عم يراقبهم.",

  "Enter the Debates": "ادخل المناظرات",
  "Make a Prediction": "سجّل توقع",
  "Read The Pulse": "اقرأ النبض",
  "Meet The Voices": "تعرّف على الأصوات",

  "The questions no one asks out loud — about identity, money, religion, gender, power, and the future. Every debate is anonymous. Every vote is permanent. What the region thinks stays on record.": "الأسئلة اللي ما حدا بيسألها بصوت عالي — عن الهوية، المال، الدين، الجنس، السلطة، والمستقبل. كل مناظرة مجهولة. كل صوت دائم. رأي المنطقة بيبقى مسجّل.",
  "Not what should happen — what will. A Bloomberg-style prediction market for MENA's biggest questions. Track confidence over time, watch consensus shift, and bet on where the region is headed.": "مش شو لازم يصير — شو رح يصير. سوق توقعات بأسلوب بلومبرغ لأكبر أسئلة المنطقة. تابع الثقة عبر الوقت، شوف الإجماع كيف بيتغير، وراهن على وين المنطقة رايحة.",
  "Exploding Topics for MENA. 36 data-driven trend cards across 8 categories — from press freedom collapse to the $4.1T sovereign wealth machine. Filterable by Power, Money, Society, Tech, Survival, Migration, Culture, and Health. Real-time population counter. Live tickers. The region's vital signs.": "ترندات منفجرة للمنطقة. ٣٦ كرت ترند مبني على بيانات عبر ٨ تصنيفات — من انهيار حرية الصحافة لماكينة الثروة السيادية بقيمة ٤.١ تريليون دولار. فلترة حسب السلطة، المال، المجتمع، التكنولوجيا، البقاء، الهجرة، الثقافة، والصحة. عداد سكان مباشر. شريط أخبار حي. العلامات الحيوية للمنطقة.",
  "94 founders, operators, and changemakers from 10 countries — curated, not applied-for. Each Voice has a story, a lesson, and a quote. This is the region's leadership index, built one profile at a time.": "٩٤ مؤسس ومشغّل وصانع تغيير من ١٠ دول — منتقاة، مش مُقدَّم عليها. كل صوت عنده قصة، ودرس، واقتباس. هاي فهرس القيادة بالمنطقة، مبني بروفايل ببروفايل.",

  "Founding Voices": "أصوات مؤسسة",
  "Active Debates": "مناظرات نشطة",
  "MENA Countries": "دول المنطقة",
  "People in MENA": "سكان المنطقة",

  "From the Founder": "من المؤسس",
  "This started as a question I kept asking at dinner tables, in taxis, in boardrooms, and in WhatsApp groups at midnight: what does the Middle East actually think?": "بدأت كسؤال كنت دايماً أسأله على طاولات العشا، بالتاكسيات، بغرف الاجتماعات، وبمجموعات الواتساب بنص الليل: شو الشرق الأوسط فعلاً بيفكر؟",
  "Not what we're told it thinks. Not what leaders say it thinks. Not what Western media assumes it thinks. What the 541 million people who live here, work here, raise children here, and build things here — actually think.": "مش شو بيقولولنا إنه بيفكر. مش شو القادة بيقولوا. مش شو الإعلام الغربي بيفترض. شو الـ ٥٤١ مليون شخص اللي عايشين هون، شغالين هون، عم يربوا ولادهم هون، وبانين أشياء هون — فعلاً بيفكروا.",
  "There was no single place to find out. So I built one.": "ما كان في مكان واحد لنعرف. فبنيت واحد.",
  "\"The Tribunal is a social experiment disguised as a platform. Every debate is a room I'm placing the region inside. Every vote is a voice that would otherwise never be counted. Every prediction is a bet on where we're headed.\"": "\"المحكمة تجربة اجتماعية متخفية كمنصة. كل مناظرة غرفة عم حط المنطقة جواها. كل صوت رأي ما كان ليُحسب أبداً. كل توقع رهان على وين رايحين.\"",
  "I don't have the answers. Nobody does. But for the first time, we're collecting them — honestly, anonymously, at scale. Every vote, every prediction, every profile adds to a picture of the region that has never existed before.": "ما عندي الأجوبة. ما حدا عنده. بس لأول مرة، عم نجمعهم — بصدق، بسرية، وعلى نطاق واسع. كل صوت، كل توقع، كل بروفايل بيضيف لصورة عن المنطقة ما كانت موجودة قبل.",
  "— Kareem Kaddoura, Founder": "— كريم قدورة، المؤسس",

  "What We Stand For": "شو بنؤمن فيه",
  "A Social Experiment": "تجربة اجتماعية",
  "Every question is a controlled provocation. The point is not agreement. The point is honesty.": "كل سؤال استفزاز مدروس. الهدف مش الاتفاق. الهدف الصدق.",
  "No Editorial Agenda": "بدون أجندة تحريرية",
  "We write the questions. We never write the answers. What the region thinks is the region's business.": "نحنا نكتب الأسئلة. ما منكتب الأجوبة أبداً. شو المنطقة بتفكر هاد شغل المنطقة.",
  "Private Opinions, Public Data": "آراء خاصة، بيانات عامة",
  "Your vote is anonymous. The aggregate is not. That gap is where the truth lives.": "صوتك مجهول. المجموع لأ. هالفجوة هي وين الحقيقة عايشة.",
  "The Questions No One Asks": "الأسئلة اللي ما حدا بيسألها",
  "Not because they're dangerous. Because nobody built the room yet. We built the room.": "مش لأنها خطيرة. لأنه ما حدا بنى الغرفة لسا. نحنا بنيناها.",
  "Youngest Region on Earth": "أصغر منطقة على الأرض",
  "60% of MENA is under 30. 541 million people. That's not a demographic stat — it's 541 million opinions waiting to be heard.": "٦٠٪ من المنطقة تحت الـ٣٠. ٥٤١ مليون شخص. هاي مش إحصائية ديموغرافية — هاي ٥٤١ مليون رأي بيستنوا يُسمعوا.",
  "Real People Only": "ناس حقيقيين بس",
  "No bots. No astroturfing. No sponsored opinions. Just the region, speaking for itself.": "بدون بوتات. بدون تزييف. بدون آراء ممولة. بس المنطقة، تحكي عن حالها.",

  "The Region We Cover": "المنطقة اللي منغطيها",
  "19 countries. 541 million people. One platform.": "١٩ دولة. ٥٤١ مليون شخص. منصة وحدة.",

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

  "Our Ethos": "رؤيتنا",
  "The Tribunal exists because the Middle East and North Africa is the most opinionated, least surveyed region on earth. There are 541 million people here — builders, dreamers, troublemakers — and no one has ever given them a single platform to say what they really think.": "المحكمة موجودة لأنه الشرق الأوسط وشمال أفريقيا هي أكتر منطقة عندها آراء وأقل منطقة تُستطلع على الأرض. في ٥٤١ مليون شخص هون — بنّائين، حالمين، مشاغبين — وما حدا أعطاهم منصة وحدة ليقولوا شو فعلاً بيفكروا.",
  "We are not a news outlet. We are not a think tank. We do not do sponsored polls or PR research. Every question on this platform is designed to surface the truth — not a narrative.": "نحنا مش وسيلة إعلامية. مش مركز أبحاث. ما منعمل استطلاعات ممولة أو أبحاث علاقات عامة. كل سؤال على المنصة مصمم ليطلّع الحقيقة — مش رواية.",
  "We believe that anonymous, honest data from real people is more valuable than any op-ed, any government report, any think-tank white paper. We believe the region knows itself better than anyone watching from the outside.": "منؤمن إنه البيانات المجهولة والصادقة من ناس حقيقيين أقيم من أي مقال رأي، أي تقرير حكومي، أي ورقة بيضاء من مركز أبحاث. منؤمن إنه المنطقة بتعرف حالها أحسن من أي حدا عم يراقب من برا.",
  "The questions are provocative because the region deserves provocative questions. The data is honest because anything less is a waste of everyone's time.": "الأسئلة استفزازية لأنه المنطقة تستاهل أسئلة استفزازية. البيانات صادقة لأنه أي شي أقل هو إضاعة وقت الكل.",
  "This is MENA's living dataset — and it grows with every vote.": "هاي الداتاسيت الحيّة للمنطقة — وبتكبر مع كل صوت.",

  "\"Bringing the voices of the Middle East into one room. Finally.\"": "\"جمع أصوات الشرق الأوسط بغرفة وحدة. أخيراً.\"",
  "— Kareem Kaddoura, Founder · The Tribunal, by The Middle East Hustle · 2026": "— كريم قدورة، المؤسس · المحكمة، من ذا ميدل إيست هاسل · ٢٠٢٦",
  "Cast Your Vote": "صوّت الآن",

  "What is The Tribunal?": "شو هي المحكمة؟",
  "Is The Tribunal free to use?": "هل المحكمة مجانية؟",
  "Who is behind The Tribunal?": "مين ورا المحكمة؟",
  "Are the debates scientific?": "هل الاستطلاعات علمية؟",

  "How do the debates work?": "كيف تشتغل المناظرات؟",
  "Can I vote more than once?": "فيني صوّت أكتر من مرة؟",
  "How are debate questions chosen?": "كيف بيتم اختيار أسئلة المناظرات؟",
  "What is the Share Gate?": "شو هو Share Gate؟",

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
  "Last updated: March 2026 · Governed by UAE Law": "آخر تحديث: مارس ٢٠٢٦ · يخضع لقانون الإمارات",

  "103 VOICES": "١٠٣ صوت",
  "Search voices by name, company, or country...": "ابحث عن الأصوات بالاسم أو الشركة أو البلد...",
  "All Countries": "كل الدول",
  "All Sectors": "كل القطاعات",

  "Think You Belong In The Voices?": "بتحس إنك لازم تكون من الأصوات؟",
  "Apply Now →": "← قدّم الآن",

  "Welcome to The Tribunal": "أهلاً بالمحكمة",
  "The most honest conversation in the Middle East. Join the founders, operators, and change-makers already voting.": "أصدق محادثة بالشرق الأوسط. انضم للمؤسسين والمشغلين وصنّاع التغيير اللي عم يصوتوا.",
  "You've just unlocked something real.": "فتحت شي حقيقي.",

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
  "The founders, operators, and change-makers shaping the Middle East. Real people. Real stories.": "المؤسسين والمشغلين وصنّاع التغيير اللي عم يشكلوا الشرق الأوسط. ناس حقيقيين. قصص حقيقية.",
  "View All Voices": "كل الأصوات",
  "Explore Topics": "استكشف المواضيع",
  "The Region's Opinion.": "رأي المنطقة.",
  "Unfiltered.": "بدون فلتر.",
  "Join The Hustle": "انضم للهاسل",
  "Someone from ": "شخص من ",
  " just voted on ": " صوّت الآن على ",
  "your@email.com": "your@email.com",
}
