import { Link } from "wouter"
import { Layout } from "@/components/layout/Layout"
import { useI18n } from "@/lib/i18n"
import { usePageConfig, useLiveCounts, useSiteSettings } from "@/hooks/use-cms-data"
import { usePageTitle } from "@/hooks/use-page-title"
import { TitlePunctuation } from "@/components/TitlePunctuation"
import { PageIndex } from "@/components/layout/PageIndex"

const FALLBACK_PILLARS = [
  {
    num: "01",
    title: "Debates",
    body: "The questions no one asks out loud — about identity, money, religion, gender, power, and the future. Every debate is anonymous. Every vote is permanent. What the region thinks stays on record.",
    link: "/debates",
    cta: "Enter the Debates",
  },
  {
    num: "02",
    title: "Predictions",
    body: "Not what should happen — what will. A Bloomberg-style prediction market for MENA's biggest questions. Track confidence over time, watch consensus shift, and bet on where the region is headed.",
    link: "/predictions",
    cta: "Make a Prediction",
  },
  {
    num: "03",
    title: "The Pulse",
    body: "Exploding Topics for MENA. 36 data-driven trend cards across 8 categories — from press freedom collapse to the $4.1T sovereign wealth machine. Filterable by Power, Money, Society, Tech, Survival, Migration, Culture, and Health. Real-time population counter. Live tickers. The region's vital signs.",
    link: "/pulse",
    cta: "Read The Pulse",
  },
  {
    num: "04",
    title: "The Voices",
    body: "94 founders, operators, and changemakers from 10 countries — curated, not applied-for. Each Voice has a story, a lesson, and a quote. This is the region's leadership index, built one profile at a time.",
    link: "/voices",
    cta: "Meet The Voices",
  },
  {
    num: "05",
    title: "The Majlis",
    body: "A private, members-only forum for the region's verified founders, operators, and changemakers. Real-time conversations across curated channels — no algorithms, no noise. Where the people shaping MENA actually talk to each other.",
    link: "/majlis/login",
    cta: "Enter The Majlis",
  },
]

const FALLBACK_BELIEFS = [
  {
    num: "01",
    title: "A Social Experiment",
    body: "Every question is a controlled provocation. The point is not agreement. The point is honesty.",
  },
  {
    num: "02",
    title: "No Editorial Agenda",
    body: "We write the questions. We never write the answers. What the region thinks is the region's business.",
  },
  {
    num: "03",
    title: "Private Opinions, Public Data",
    body: "Your vote is anonymous. The aggregate is not. That gap is where the truth lives.",
  },
  {
    num: "04",
    title: "The Questions No One Asks",
    body: "Not because they're dangerous. Because nobody built the room yet. We built the room.",
  },
  {
    num: "05",
    title: "Youngest Region on Earth",
    body: "60% of MENA is under 30. 541 million people. That's not a demographic stat — it's 541 million opinions waiting to be heard.",
  },
  {
    num: "06",
    title: "Real People Only",
    body: "No bots. No astroturfing. No sponsored opinions. Just the region, speaking for itself.",
  },
]

const COUNTRIES_DEFAULT = [
  { name: "Egypt", flag: "🇪🇬", pop: "112M" },
  { name: "Iran", flag: "🇮🇷", pop: "89M" },
  { name: "Iraq", flag: "🇮🇶", pop: "44M" },
  { name: "Saudi Arabia", flag: "🇸🇦", pop: "37M" },
  { name: "Morocco", flag: "🇲🇦", pop: "37M" },
  { name: "Algeria", flag: "🇩🇿", pop: "46M" },
  { name: "Sudan", flag: "🇸🇩", pop: "48M" },
  { name: "Yemen", flag: "🇾🇪", pop: "34M" },
  { name: "Syria", flag: "🇸🇾", pop: "23M" },
  { name: "UAE", flag: "🇦🇪", pop: "10M" },
  { name: "Jordan", flag: "🇯🇴", pop: "11M" },
  { name: "Tunisia", flag: "🇹🇳", pop: "12M" },
  { name: "Libya", flag: "🇱🇾", pop: "7M" },
  { name: "Lebanon", flag: "🇱🇧", pop: "5.5M" },
  { name: "Palestine", flag: "🇵🇸", pop: "5.5M" },
  { name: "Oman", flag: "🇴🇲", pop: "4.6M" },
  { name: "Kuwait", flag: "🇰🇼", pop: "4.3M" },
  { name: "Qatar", flag: "🇶🇦", pop: "2.7M" },
  { name: "Bahrain", flag: "🇧🇭", pop: "1.5M" },
]

interface AboutConfig {
  hero?: { titleLine1?: string; titleLine2?: string; tagline?: string; subtitle?: string }
  pillars?: Array<{ num: string; title: string; body: string; link: string; cta: string }>
  beliefs?: Array<{ num: string; title: string; body: string }>
  founderStatement?: { text?: string; author?: string; quote?: string }
  regionCoverage?: Array<{ name: string; flag: string; population: string }>
  punctuations?: string[]
}

export default function About() {
  usePageTitle({
    title: "About",
    description: "The Tribunal is the anonymous voice of MENA -- 541 million people, one platform for debates, predictions, and real opinions.",
  });
  const { t, isAr } = useI18n()
  const { data: pageConfig } = usePageConfig<AboutConfig & {
    stats?: Array<{ num: string; label: string }>;
  }>("about")

  const { data: siteSettings } = useSiteSettings()
  const voicesEnabled = siteSettings?.featureToggles?.voices?.enabled ?? true
  const majlisEnabled = siteSettings?.featureToggles?.majlis?.enabled ?? false
  const pillars = (pageConfig?.pillars?.length ? pageConfig.pillars : FALLBACK_PILLARS)
    .filter(p =>
      (voicesEnabled || !p.link?.startsWith("/voices"))
      && (majlisEnabled || !p.link?.startsWith("/majlis"))
    )
  const beliefs = pageConfig?.beliefs?.length ? pageConfig.beliefs : FALLBACK_BELIEFS
  const hero = pageConfig?.hero
  const founder = pageConfig?.founderStatement
  const countries = pageConfig?.regionCoverage?.length
    ? pageConfig.regionCoverage.map(c => ({ name: c.name, flag: c.flag, pop: c.population }))
    : COUNTRIES_DEFAULT
  const { data: liveCounts } = useLiveCounts()
  const stats = pageConfig?.stats?.length ? pageConfig.stats : [
    { num: String(liveCounts?.voices ?? 94), label: "Founding Voices" },
    { num: `${liveCounts?.debates ?? 135}+`, label: "Active Debates" },
    { num: "19", label: "MENA Countries" },
    { num: "541M", label: "People in MENA" },
  ]

  const pageSections = [
    { id: "what-is-the-tribunal", label: t("What Is It") },
    { id: "the-platform", label: t("The Platform") },
    { id: "from-the-founder", label: t("From the Founder") },
    { id: "what-we-stand-for", label: t("What We Stand For") },
    { id: "the-region", label: t("The Region") },
    { id: "our-ethos", label: t("Our Ethos") },
  ]

  return (
    <Layout>
      <PageIndex sections={pageSections} />

      {/* Hero */}
      <div className="bg-foreground text-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10">
          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.28em", color: "#DC143C", marginBottom: "0.5rem" }}>
            {t(hero?.tagline || "Est. 2026 · Founded by Kareem Kaddoura")}
          </p>
          <h1 style={{ fontFamily: isAr ? "'IBM Plex Sans Arabic', sans-serif" : "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: "clamp(2rem, 5vw, 3.5rem)", textTransform: "uppercase", color: "var(--background)", letterSpacing: "-0.01em", lineHeight: 1.05, marginBottom: "0.5rem" }}>
            {t(hero?.titleLine1 || "The Region's First")}<br />
            {t(hero?.titleLine2 || "Collective Mirror")}<TitlePunctuation punctuations={pageConfig?.punctuations} />
          </h1>
          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.18em" }}>
            {t(hero?.subtitle || "541 million people. Zero platforms asking what they think. Until now.")}
          </p>
        </div>
      </div>

      {/* What TMH Is */}
      <div id="what-is-the-tribunal" className="max-w-3xl mx-auto px-4 py-20 border-b border-border scroll-mt-24">
        <h2 className="font-serif font-black uppercase text-2xl text-foreground mb-8 border-l-4 border-primary pl-4">
          {t("What Is The Tribunal?")}
        </h2>
        <p className="text-xl font-sans leading-relaxed text-foreground mb-8">
          {t("The Tribunal is MENA's first opinion intelligence platform — part editorial, part data engine, part social experiment. A product by The Middle East Hustle.")}
        </p>
        <p className="text-base text-muted-foreground font-sans leading-relaxed mb-6">
          {t("We ask the questions nobody else asks. We collect anonymous votes from around the world on 19 MENA countries. We track predictions over time. We surface the trends reshaping the region. And we profile the people building it.")}
        </p>
        <p className="text-base text-muted-foreground font-sans leading-relaxed mb-6">
          {t("Think of it as the WSJ of MENA opinion — editorial in presentation, ruthlessly neutral in methodology, and built for the 541 million people who live, work, and build in the Middle East and North Africa.")}
        </p>
        <p className="text-base text-muted-foreground font-sans leading-relaxed">
          {t("Everything on The Tribunal — every debate, every prediction, every trend, every Voice — adds to a living dataset of what the region actually thinks. Not what governments report. Not what Western media assumes. What real people vote for when nobody's watching.")}
        </p>
      </div>

      {/* The Four Pillars */}
      <div id="the-platform" className="py-20 bg-secondary/20 border-b border-border scroll-mt-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif font-black uppercase text-3xl border-b-2 border-foreground pb-4 mb-12 text-foreground">
            {t("The Platform")}
          </h2>
          <div className="grid md:grid-cols-2 gap-10">
            {pillars.map(p => (
              <div key={p.num} className="relative">
                <span className="text-6xl font-display font-black text-gray-900/20 dark:text-gray-100/20 leading-none select-none block">{p.num}</span>
                <div className="-mt-3">
                  <h3 className="font-serif font-black uppercase text-lg border-b border-border pb-2 mb-3 text-foreground tracking-wide">
                    {t(p.title)}
                  </h3>
                  <p className="text-sm text-muted-foreground font-sans leading-relaxed mb-4">{t(p.body)}</p>
                  <Link
                    href={p.link}
                    className="inline-block text-xs font-serif font-bold uppercase tracking-widest text-primary hover:text-foreground transition-colors border-b border-primary pb-0.5"
                  >
                    {t(p.cta)} {isAr ? "←" : "→"}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Numbers */}
      <div className="bg-foreground text-background py-16 border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map(stat => (
              <div key={stat.label}>
                <div className="font-display text-4xl md:text-5xl leading-none mb-2">{stat.num}</div>
                <div className="text-[10px] uppercase tracking-[0.2em] font-serif text-primary">{t(stat.label)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Founder Statement */}
      <div id="from-the-founder" className="max-w-3xl mx-auto px-4 py-20 border-b border-border scroll-mt-24">
        <h2 className="font-serif font-black uppercase text-2xl text-foreground mb-8 border-l-4 border-primary pl-4">
          {t("From the Founder")}
        </h2>
        {(founder?.text || "").split("\n\n").filter(Boolean).length > 0 ? (
          founder!.text!.split("\n\n").filter(Boolean).map((para, i) => (
            <p key={i} className={`text-${i === 0 ? 'xl' : 'base'} ${i === 0 ? 'text-foreground' : 'text-muted-foreground'} font-sans leading-relaxed mb-6`}>
              {t(para)}
            </p>
          ))
        ) : (
          <>
            <p className="text-xl font-sans leading-relaxed text-foreground mb-8">
              {t("This started as a question I kept asking at dinner tables, in taxis, in boardrooms, and in WhatsApp groups at midnight: what does the Middle East actually think?")}
            </p>
            <p className="text-base text-muted-foreground font-sans leading-relaxed mb-6">
              {t("Not what we're told it thinks. Not what leaders say it thinks. Not what Western media assumes it thinks. What the 541 million people who live here, work here, raise children here, and build things here — actually think.")}
            </p>
            <p className="text-base text-muted-foreground font-sans leading-relaxed mb-6">
              {t("There was no single place to find out. So I built one.")}
            </p>
          </>
        )}

        <blockquote className="font-display text-2xl md:text-3xl border-l-4 border-primary pl-6 py-4 my-12 text-foreground leading-snug">
          {t(founder?.quote || "\"The Tribunal is a social experiment disguised as a platform. Every debate is a room I'm placing the region inside. Every vote is a voice that would otherwise never be counted. Every prediction is a bet on where we're headed.\"")}
        </blockquote>

        {!founder?.text && (
          <p className="text-base text-muted-foreground font-sans leading-relaxed mb-6">
            {t("I don't have the answers. Nobody does. But for the first time, we're collecting them — honestly, anonymously, at scale. Every vote, every prediction, every profile adds to a picture of the region that has never existed before.")}
          </p>
        )}

        <p className="text-base font-sans leading-relaxed text-foreground font-bold">
          {t(founder?.author ? `— ${founder.author}` : "— Kareem Kaddoura, Founder")}
        </p>
      </div>

      {/* Beliefs */}
      <div id="what-we-stand-for" className="py-20 bg-secondary/20 border-t border-border border-b scroll-mt-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif font-black uppercase text-3xl border-b-2 border-foreground pb-4 mb-12 text-foreground">
            {t("What We Stand For")}
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {beliefs.map(b => (
              <div key={b.num} className="relative">
                <span className="text-6xl font-display font-black text-gray-900/20 dark:text-gray-100/20 leading-none select-none block">{b.num}</span>
                <div className="-mt-3">
                  <h3 className="font-serif font-black uppercase text-lg border-b border-border pb-2 mb-3 text-foreground tracking-wide">
                    {t(b.title)}
                  </h3>
                  <p className="text-sm text-muted-foreground font-sans leading-relaxed">{t(b.body)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MENA Countries */}
      <div id="the-region" className="py-16 border-b border-border scroll-mt-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif font-black uppercase text-2xl text-foreground mb-2 border-l-4 border-primary pl-4">
            {t("The Region We Cover")}
          </h2>
          <p className="text-sm text-foreground/75 font-sans mb-8 pl-5">
            {t(`${countries.length} countries. 541 million people. One platform.`)}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {countries.map(c => (
              <div key={c.name} className="border border-border px-3 py-2.5 text-xs font-serif uppercase tracking-widest text-foreground/80 text-center flex flex-col items-center gap-1">
                <span className="text-xl not-italic" style={{ fontFamily: "system-ui" }}>{c.flag}</span>
                <span>{t(c.name)}</span>
                <span className="text-[9px] tracking-normal normal-case text-muted-foreground font-sans">{c.pop}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ethos */}
      <div id="our-ethos" className="py-16 border-b border-border bg-secondary/10 scroll-mt-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif font-black uppercase text-2xl text-foreground mb-8 border-l-4 border-primary pl-4">
            {t("Our Ethos")}
          </h2>
          <div className="space-y-6 text-base text-foreground/80 font-sans leading-relaxed">
            <p>
              {t("The Tribunal exists because the Middle East and North Africa is the most opinionated, least surveyed region on earth. There are 541 million people here — builders, dreamers, troublemakers — and no one has ever given them a single platform to say what they really think.")}
            </p>
            <p>
              {t("We are not a news outlet. We are not a think tank. We do not do sponsored polls or PR research. Every question on this platform is designed to surface the truth — not a narrative.")}
            </p>
            <p>
              {t("We believe that anonymous, honest data from real people is more valuable than any op-ed, any government report, any think-tank white paper. We believe the region knows itself better than anyone watching from the outside.")}
            </p>
            <p>
              {t("The questions are provocative because the region deserves provocative questions. The data is honest because anything less is a waste of everyone's time.")}
            </p>
            <p className="text-foreground font-bold">
              {t("This is MENA's living dataset — and it grows with every vote.")}
            </p>
          </div>
        </div>
      </div>

      {/* Closing */}
      <div className="py-20 border-t border-border">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <p className="font-display text-3xl text-foreground mb-2 leading-snug italic">
            {t("\"Bringing the voices of the Middle East into one room. Finally.\"")}
          </p>
          <p className="text-sm text-muted-foreground font-sans mb-12">
            {t("— Kareem Kaddoura, Founder · The Tribunal, by The Middle East Hustle · 2026")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/debates"
              className="bg-foreground text-background px-8 py-3 font-bold uppercase tracking-widest text-xs hover:bg-primary transition-colors font-serif"
            >
              {t("Cast Your Vote")}
            </Link>
            <Link
              href="/pulse"
              className="border border-foreground text-foreground px-8 py-3 font-bold uppercase tracking-widest text-xs hover:bg-foreground hover:text-background transition-colors font-serif"
            >
              {t("Read The Pulse")}
            </Link>
            {voicesEnabled && (
              <Link
                href="/voices"
                className="border border-primary text-primary px-8 py-3 font-bold uppercase tracking-widest text-xs hover:bg-primary hover:text-white transition-colors font-serif"
              >
                {t("Meet The Voices")}
              </Link>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
