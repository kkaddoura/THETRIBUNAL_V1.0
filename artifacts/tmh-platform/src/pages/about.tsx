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
    body: "What people believe. Anonymous votes on the questions usually left to private conversations: identity, money, religion, gender, power, work, media, and the future. Every vote is private. The result is public.",
    link: "/debates",
    cta: "Enter the Debates",
  },
  {
    num: "02",
    title: "Predictions",
    body: "What people think will happen. Predictions track where the region believes things are heading. Not what should happen. What people expect will happen. The value is not the answer today. It is how confidence changes over time.",
    link: "/predictions",
    cta: "Make a Prediction",
  },
  {
    num: "03",
    title: "The Pulse",
    body: "What is actually happening. The Pulse tracks public data signals across the region: politics, money, society, technology, migration, survival, culture, and health. Every card points back to a source. No source, no signal.",
    link: "/pulse",
    cta: "Read The Pulse",
  },
  {
    num: "04",
    title: "The Voices",
    body: "The people behind the region's decisions. Voices are selected profiles of founders, operators, investors, artists, builders, and thinkers across MENA. Not just their stories. Their beliefs, choices, and positions.",
    link: "/voices",
    cta: "Meet the Voices",
  },
  {
    num: "05",
    title: "The Majlis",
    body: "A private room for serious conversation. The Majlis is a members-only space for verified Voices and selected participants. No open comments. No algorithmic noise. No public performance.",
    link: "/majlis/login",
    cta: "Enter the Majlis",
  },
]

const FALLBACK_BELIEFS = [
  {
    num: "01",
    title: "We ask what people actually believe",
    body: "Not what they say publicly. Not what they are expected to say.",
  },
  {
    num: "02",
    title: "We ask. We do not answer",
    body: "The Tribunal does not publish positions. It records them.",
  },
  {
    num: "03",
    title: "Private votes. Public data",
    body: "Your vote is anonymous. The aggregate is not.",
  },
  {
    num: "04",
    title: "Hard questions belong in public",
    body: "Avoiding them does not make them disappear. It only makes the data weaker.",
  },
  {
    num: "05",
    title: "The region deserves a record",
    body: "Private opinion should not disappear into WhatsApp groups, dinner tables, and closed rooms.",
  },
  {
    num: "06",
    title: "If it is not human, it does not count",
    body: "No bots. No sponsored sentiment. No manufactured consensus.",
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
    description: "The Tribunal is an anonymous opinion platform for the Middle East and North Africa. Anonymous votes. Human opinions. Public data.",
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
  const stats = (pageConfig?.stats?.length ? pageConfig.stats : [
    { num: String(liveCounts?.voices ?? 94), label: "Founding Voices" },
    { num: `${liveCounts?.debates ?? 135}+`, label: "Active Debates" },
    { num: "19", label: "MENA Countries" },
    { num: "541M", label: "People in MENA" },
  ]).filter(s => voicesEnabled || !/voices?/i.test(s.label))

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
          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.28em", color: "#DC143C", marginBottom: "0.5rem" }}>
            {t(hero?.tagline || "Est. 2026 · Founded by Kareem Kaddoura")}
          </p>
          <h1 style={{ fontFamily: isAr ? "'IBM Plex Sans Arabic', sans-serif" : "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: "clamp(2rem, 5vw, 3.5rem)", textTransform: "uppercase", color: "var(--background)", letterSpacing: "-0.01em", lineHeight: 1.05, marginBottom: "0.5rem" }}>
            {t(hero?.titleLine1 || "The Region's")}<br />
            {t(hero?.titleLine2 || "Collective Mirror")}<TitlePunctuation punctuations={pageConfig?.punctuations} />
          </h1>
          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "0.90rem", textTransform: "uppercase", letterSpacing: "0.18em" }}>
            {t(hero?.subtitle || "Anonymous votes. Human opinions. Public data.")}
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.83rem", letterSpacing: "0.04em", opacity: 0.6, marginTop: "0.85rem" }}>
            {t("Your vote is anonymous. The data is real.")}
          </p>
        </div>
      </div>

      {/* What TMH Is */}
      <div id="what-is-the-tribunal" className="max-w-3xl mx-auto px-4 py-20 border-b border-border scroll-mt-24">
        <h2 className="font-serif font-black uppercase text-2xl text-foreground mb-8 border-l-4 border-primary pl-4">
          {t("What Is The Tribunal?")}
        </h2>
        <p className="text-xl font-sans leading-relaxed text-foreground mb-8">
          {t("The Tribunal is an anonymous opinion platform for the Middle East and North Africa.")}
        </p>
        <p className="text-base text-muted-foreground font-sans leading-relaxed mb-6">
          {t("We ask the questions people avoid in public. We collect votes, predictions, and data signals across the region. Then we show the results without turning them into a narrative.")}
        </p>
        <p className="text-base text-muted-foreground font-sans leading-relaxed mb-6">
          {t("This is not media. It is not a think tank. It is not a comment section.")}
        </p>
        <p className="text-base text-muted-foreground font-sans leading-relaxed mb-6">
          {t("It is a record of what people actually think when their names are not attached.")}
        </p>
        <p className="text-base text-muted-foreground font-sans leading-relaxed mb-8">
          {voicesEnabled
            ? t("Every debate, prediction, trend, and Voice adds to a growing picture of the region from the inside.")
            : t("Every debate, prediction, and trend adds to a growing picture of the region from the inside.")}
        </p>
        <p className="text-sm font-serif italic text-foreground/70 leading-relaxed border-l-2 border-primary/60 pl-4">
          {t("Anonymous does not mean artificial. If it is not human, it is not counted.")}
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
                <div className="text-[12px] uppercase tracking-[0.2em] font-serif text-primary">{t(stat.label)}</div>
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
            <p className="text-xl font-sans leading-relaxed text-foreground mb-6">
              {t("This started with a simple question I kept asking in private rooms:")}
            </p>
            <p className="text-xl font-sans leading-relaxed text-foreground italic mb-8">
              {t("What does the Middle East actually think?")}
            </p>
            <p className="text-base text-muted-foreground font-sans leading-relaxed mb-6">
              {t("Not what we say publicly. Not what leaders say. Not what foreign media assumes. Not what people perform online.")}
            </p>
            <p className="text-base text-foreground font-sans leading-relaxed font-bold mb-6">
              {t("What people actually think.")}
            </p>
            <p className="text-base text-muted-foreground font-sans leading-relaxed mb-6">
              {t("There was no single place to see that. So I built one.")}
            </p>
            <p className="text-base text-muted-foreground font-sans leading-relaxed mb-6">
              {t("The Tribunal is not here to answer for the region. It is here to record the region's answers.")}
            </p>
            <p className="text-base text-muted-foreground font-sans leading-relaxed mb-6">
              {t("Every vote is anonymous. Every result is public. Over time, that creates something we have never had before: a living record of private opinion at regional scale.")}
            </p>
          </>
        )}

        <blockquote className="font-display text-2xl md:text-3xl border-l-4 border-primary pl-6 py-4 my-12 text-foreground leading-snug">
          {t(founder?.quote || "\"People do not lack opinions. They lack a place to say them honestly.\"")}
        </blockquote>

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
            {t(`${countries.length} countries. One regional lens.`)}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {countries.map(c => (
              <div key={c.name} className="border border-border px-3 py-2.5 text-xs font-serif uppercase tracking-widest text-foreground/80 text-center flex flex-col items-center gap-1">
                <span className="text-xl not-italic" style={{ fontFamily: "system-ui" }}>{c.flag}</span>
                <span>{t(c.name)}</span>
                <span className="text-[10px] tracking-normal normal-case text-muted-foreground font-sans">{c.pop}</span>
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
              {t("The Middle East and North Africa is one of the most opinionated and least transparently measured regions in the world.")}
            </p>
            <p>
              {t("People talk. Constantly. At home. At work. In taxis. In group chats. Behind closed doors.")}
            </p>
            <p>
              {t("But those opinions rarely become data.")}
            </p>
            <p>
              {t("The Tribunal exists to close that gap.")}
            </p>
            <p>
              {t("We are not here to tell the region what to think. We are here to make private opinion visible in aggregate.")}
            </p>
            <p>
              {t("The questions are direct because soft questions produce soft answers. The data matters because the region deserves to see itself clearly.")}
            </p>
            <p className="text-foreground font-bold">
              {t("This is MENA's living record of opinion. It grows with every vote.")}
            </p>
          </div>
        </div>
      </div>

      {/* Closing */}
      <div className="py-20 border-t border-border">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <p className="font-display text-3xl text-foreground mb-2 leading-snug italic">
            {t("\"People do not lack opinions. They lack a place to say them honestly.\"")}
          </p>
          <p className="text-sm text-muted-foreground font-sans mb-12">
            {t("— Kareem Kaddoura, Founder · The Tribunal · 2026")}
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
