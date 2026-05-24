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
    body: "What people believe. Questions about work, money, identity, media, culture, power and the future. Vote privately. See where you stand against everyone else.",
    link: "/debates",
    cta: "Enter the Debates",
  },
  {
    num: "02",
    title: "Predictions",
    body: "What people think will happen. Not what should happen. What people expect will happen. Predictions track how confidence changes over time. Sign up if you want to save your calls and come back to them later.",
    link: "/predictions",
    cta: "Make a Prediction",
  },
  {
    num: "03",
    title: "Pulse",
    body: "What is actually happening. A public data layer that gives context to the questions people are voting on, using sourced data points across politics, money, society, technology and culture.",
    link: "/pulse",
    cta: "Read The Pulse",
  },
  {
    num: "04",
    title: "Voices",
    body: "The people behind the region's decisions. Curated profiles of people with a clear connection to the region and a body of work we can verify. Not just what they do. What they believe, what they have built, and where they stand.",
    link: "/voices",
    cta: "Meet the Voices",
  },
  {
    num: "05",
    title: "The Majlis",
    body: "A private room for serious conversation. A members-only space for selected participants. No open comments. No algorithmic noise. No public performance.",
    link: "/majlis/login",
    cta: "Enter The Majlis",
  },
]

const FALLBACK_BELIEFS = [
  {
    num: "01",
    title: "Ask directly",
    body: "Soft questions produce soft answers.",
  },
  {
    num: "02",
    title: "Do not answer for people",
    body: "The Tribunal asks the question. People decide the result.",
  },
  {
    num: "03",
    title: "Keep votes private",
    body: "Your name is not shown with your vote.",
  },
  {
    num: "04",
    title: "Show the result publicly",
    body: "The value is in the aggregate.",
  },
  {
    num: "05",
    title: "Let people save their own record",
    body: "If someone signs up, they can view their previous activity and return to it later.",
  },
  {
    num: "06",
    title: "Count people, not noise",
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
    description: "The Tribunal is a private voting platform for the Middle East and North Africa. People vote privately. Results are shown publicly.",
  });
  const { t, isAr } = useI18n()
  const { data: pageConfig } = usePageConfig<AboutConfig & {
    stats?: Array<{ num: string; label: string }>;
  }>("about")

  const { data: siteSettings } = useSiteSettings()
  const voicesEnabled = siteSettings?.featureToggles?.voices?.enabled ?? false
  const majlisEnabled = siteSettings?.featureToggles?.majlis?.enabled ?? false
  const pulseEnabled = siteSettings?.featureToggles?.pulse?.enabled ?? false
  const pillars = (pageConfig?.pillars?.length ? pageConfig.pillars : FALLBACK_PILLARS)
    .filter(p =>
      (voicesEnabled || !p.link?.startsWith("/voices"))
      && (majlisEnabled || !p.link?.startsWith("/majlis"))
      && (pulseEnabled || !p.link?.startsWith("/pulse"))
    )
  const beliefs = pageConfig?.beliefs?.length ? pageConfig.beliefs : FALLBACK_BELIEFS
  const hero = pageConfig?.hero
  const founder = pageConfig?.founderStatement
  const countries = pageConfig?.regionCoverage?.length
    ? pageConfig.regionCoverage.map(c => ({ name: c.name, flag: c.flag, pop: c.population }))
    : COUNTRIES_DEFAULT
  const { data: liveCounts } = useLiveCounts()
  const stats = (pageConfig?.stats?.length ? pageConfig.stats : [
    { num: `${liveCounts?.debates ?? 100}+`, label: "Live Questions" },
    { num: "19", label: "Countries Covered" },
    { num: "Debates", label: "+ Predictions" },
    { num: "Private", label: "Voting" },
  ]).filter(s => voicesEnabled || !/voices?/i.test(s.label))

  const pageSections = [
    { id: "what-is-the-tribunal", label: t("What Is It") },
    { id: "how-it-works", label: t("How It Works") },
    { id: "the-platform", label: t("The Platform") },
    { id: "what-we-stand-for", label: t("What We Stand For") },
    { id: "the-region", label: t("The Region") },
    { id: "from-the-founder", label: t("From the Founder") },
  ]

  return (
    <Layout>
      <PageIndex sections={pageSections} />

      {/* Hero */}
      <div className="bg-foreground text-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10">
          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.28em", color: "#DC143C", marginBottom: "0.5rem" }}>
            {t(hero?.tagline || "Est. 2026 · The Tribunal")}
          </p>
          <h1 style={{ fontFamily: isAr ? "'IBM Plex Sans Arabic', sans-serif" : "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: "clamp(2rem, 5vw, 3.5rem)", textTransform: "uppercase", color: "var(--background)", letterSpacing: "-0.01em", lineHeight: 1.05, marginBottom: "0.5rem" }}>
            {t(hero?.titleLine1 || "A place to say what people")}<br />
            {t(hero?.titleLine2 || "usually keep private")}<TitlePunctuation punctuations={pageConfig?.punctuations} />
          </h1>
          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "0.90rem", textTransform: "uppercase", letterSpacing: "0.18em" }}>
            {t(hero?.subtitle || "The Tribunal asks direct questions about the region and shows how people answer privately.")}
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.83rem", letterSpacing: "0.04em", opacity: 0.6, marginTop: "0.85rem" }}>
            {t("No names attached. No public performance. Just the result.")}
          </p>
        </div>
      </div>

      {/* What TMH Is */}
      <div id="what-is-the-tribunal" className="max-w-3xl mx-auto px-4 py-20 border-b border-border scroll-mt-24">
        <h2 className="font-serif font-black uppercase text-2xl text-foreground mb-8 border-l-4 border-primary pl-4">
          {t("What is The Tribunal?")}
        </h2>
        <p className="text-xl font-sans leading-relaxed text-foreground mb-8">
          {t("The Tribunal is a private voting platform for the Middle East and North Africa.")}
        </p>
        <p className="text-base text-muted-foreground font-sans leading-relaxed mb-6">
          {t("We ask the questions people usually avoid in public. People vote privately. The results are shown publicly.")}
        </p>
        <p className="text-base text-muted-foreground font-sans leading-relaxed mb-2">
          {t("It is not a news site.")}
        </p>
        <p className="text-base text-muted-foreground font-sans leading-relaxed mb-2">
          {t("It is not a think tank.")}
        </p>
        <p className="text-base text-muted-foreground font-sans leading-relaxed mb-6">
          {t("It is not a comment section.")}
        </p>
        <p className="text-base text-muted-foreground font-sans leading-relaxed mb-8">
          {t("It is a record of what people actually think when their names are not attached.")}
        </p>
        <p className="text-sm font-serif italic text-foreground/70 leading-relaxed border-l-2 border-primary/60 pl-4 mb-6">
          {t("Private does not mean fake. If it is not human, it does not count.")}
        </p>
        <p className="text-sm font-sans text-muted-foreground leading-relaxed">
          {t("You can vote without creating an account. If you sign up, you can save your activity, view previous votes and predictions, and continue from another device.")}
        </p>
      </div>

      {/* How It Works */}
      <div id="how-it-works" className="bg-secondary/10 border-b border-border scroll-mt-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <h2 className="font-serif font-black uppercase text-3xl border-b-2 border-foreground pb-4 mb-12 text-foreground">
            {t("How It Works")}
          </h2>
          <div className="grid md:grid-cols-2 gap-10">
            {[
              { num: "01", title: "Choose a question.", body: "Pick a debate or prediction from the live questions on the platform." },
              { num: "02", title: "Vote privately.", body: "Your name and email are not shown with your vote." },
              { num: "03", title: "See the result.", body: "Once you vote, you can see how others answered." },
              { num: "04", title: "Save your activity.", body: "Create an account if you want to keep your voting history, track your predictions, and continue from another device." },
              { num: "05", title: "Come back as views shift.", body: "Debates show what people believe now. Predictions show what people expect next." },
            ].map(s => (
              <div key={s.num} className="relative">
                <span className="text-6xl font-display font-black text-gray-900/20 dark:text-gray-100/20 leading-none select-none block">{s.num}</span>
                <div className="-mt-3">
                  <h3 className="font-serif font-black uppercase text-lg border-b border-border pb-2 mb-3 text-foreground tracking-wide">
                    {t(s.title)}
                  </h3>
                  <p className="text-sm text-muted-foreground font-sans leading-relaxed">{t(s.body)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* What You'll Find Here */}
      <div id="the-platform" className="py-20 bg-secondary/20 border-b border-border scroll-mt-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif font-black uppercase text-3xl border-b-2 border-foreground pb-4 mb-12 text-foreground">
            {t("What You'll Find Here")}
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
              {t("This started with a question I kept asking in private rooms:")}
            </p>
            <p className="text-xl font-sans leading-relaxed text-foreground italic mb-8">
              {t("What does the region actually think?")}
            </p>
            <p className="text-base text-muted-foreground font-sans leading-relaxed mb-2">
              {t("Not what people say in public.")}
            </p>
            <p className="text-base text-muted-foreground font-sans leading-relaxed mb-2">
              {t("Not what people post for approval.")}
            </p>
            <p className="text-base text-muted-foreground font-sans leading-relaxed mb-2">
              {t("Not what leaders claim.")}
            </p>
            <p className="text-base text-muted-foreground font-sans leading-relaxed mb-6">
              {t("Not what outsiders assume.")}
            </p>
            <p className="text-base text-foreground font-sans leading-relaxed font-bold mb-6">
              {t("What people actually think.")}
            </p>
            <p className="text-base text-muted-foreground font-sans leading-relaxed mb-6">
              {t("The Tribunal does not speak for the region. It records what people say when they can answer honestly.")}
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

      {/* Final CTA */}
      <div className="py-20 border-t border-border">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="font-serif font-black uppercase text-3xl text-foreground mb-4">
            {t("See where you stand.")}
          </h2>
          <p className="text-base text-muted-foreground font-sans mb-12">
            {t("Vote privately. See the result publicly.")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
            <Link
              href="/debates"
              className="bg-foreground text-background px-8 py-3 font-bold uppercase tracking-widest text-xs hover:bg-primary transition-colors font-serif"
            >
              {t("Cast Your Vote")}
            </Link>
            <Link
              href="/predictions"
              className="border border-foreground text-foreground px-8 py-3 font-bold uppercase tracking-widest text-xs hover:bg-foreground hover:text-background transition-colors font-serif"
            >
              {t("Make a Prediction")}
            </Link>
            {pulseEnabled && (
              <Link
                href="/pulse"
                className="border border-foreground text-foreground px-8 py-3 font-bold uppercase tracking-widest text-xs hover:bg-foreground hover:text-background transition-colors font-serif"
              >
                {t("Read The Pulse")}
              </Link>
            )}
            {voicesEnabled && (
              <Link
                href="/voices"
                className="border border-primary text-primary px-8 py-3 font-bold uppercase tracking-widest text-xs hover:bg-primary hover:text-white transition-colors font-serif"
              >
                {t("Meet The Voices")}
              </Link>
            )}
            {majlisEnabled && (
              <Link
                href="/majlis"
                className="border border-primary text-primary px-8 py-3 font-bold uppercase tracking-widest text-xs hover:bg-primary hover:text-white transition-colors font-serif"
              >
                {t("Enter The Majlis")}
              </Link>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
