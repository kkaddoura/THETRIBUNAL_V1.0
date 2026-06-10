import { Link } from "wouter"
import { Layout } from "@/components/layout/Layout"
import { useI18n } from "@/lib/i18n"
import { usePageConfig, useSiteSettings } from "@/hooks/use-cms-data"
import { usePageTitle } from "@/hooks/use-page-title"
import { TitlePunctuation } from "@/components/TitlePunctuation"
import { PageIndex } from "@/components/layout/PageIndex"

interface AboutStat { value: string; label: string }
interface AboutStep { num: string; title: string; body: string }

interface AboutConfig {
  hero?: { tagline?: string; titleLine1?: string; titleLine2?: string; subtitle?: string; microcopy?: string }
  whatIsIt?: { heading?: string; lead?: string; body?: string; negations?: string[]; note?: string; accountNote?: string }
  sharpestRead?: { heading?: string; paragraphs?: string; regionLine?: string; stats?: AboutStat[] }
  howItWorks?: { heading?: string; steps?: AboutStep[] }
  founderStatement?: { heading?: string; text?: string; author?: string; quote?: string }
  finalCta?: { heading?: string; subcopy?: string; primaryLabel?: string; primaryHref?: string; secondaryLabel?: string; secondaryHref?: string }
  punctuations?: string[]
}

// Current copy lives here as the fallback, so the page renders identically
// before anything is saved in the CMS. Editing in the CMS overrides these.
const ABOUT_DEFAULTS = {
  hero: {
    tagline: "Est. 2026 · The Tribunal",
    titleLine1: "A place to say what people",
    titleLine2: "usually keep private",
    subtitle: "The sharpest read on what the region really thinks.",
    microcopy: "No names attached. No public performance. Just the result.",
  },
  whatIsIt: {
    heading: "What is The Tribunal?",
    lead: "The Tribunal is a private voting platform for the Middle East and North Africa.",
    body: "We ask the questions people usually avoid in public. People vote privately. The results are shown publicly.\n\nIt is a sharper way to see what people actually think when their names are not attached.",
    negations: ["It is not a news site.", "It is not a think tank.", "It is not a comment section."],
    note: "Private does not mean fake. If it is not human, it does not count.",
    accountNote: "You can vote without creating an account. If you sign up, you can save your activity, view previous votes and predictions, and continue from another device.",
  },
  sharpestRead: {
    heading: "The sharpest read on the region.",
    paragraphs: "Public conversations are usually polished.\n\nPrivate conversations are usually honest.\n\nThe Tribunal exists to close that gap.\n\nEvery question is designed to surface a clearer signal: what people believe, what they expect, and where the region is shifting.",
    regionLine: "19 countries. One regional lens.",
    stats: [
      { value: "100+", label: "Live Questions" },
      { value: "19", label: "Countries Covered" },
      { value: "Private", label: "Votes" },
      { value: "Public", label: "Results" },
    ] as AboutStat[],
  },
  howItWorks: {
    heading: "How The Tribunal Works",
    steps: [
      { num: "01", title: "Choose a question.", body: "Debates ask what people believe. Predictions ask what people think will happen." },
      { num: "02", title: "Vote privately.", body: "Your name and email are not shown with your vote." },
      { num: "03", title: "See the result.", body: "Results are shown publicly in aggregate, with country and topic breakdowns where enough data exists." },
      { num: "04", title: "Save your activity.", body: "You can vote without an account. If you sign up, you can view previous votes, track predictions and continue from another device." },
      { num: "05", title: "Go deeper.", body: "Pulse adds sourced public signals. Voices profiles people with a view worth recording. The Majlis creates a private room for serious conversation." },
      { num: "06", title: "Trust the process.", body: "Questions are human reviewed. Results are opinion signals, not scientific polling. No bots. No sponsored sentiment. No fake activity." },
    ] as AboutStep[],
  },
  founderStatement: {
    heading: "From the Founder",
    text: "This started with a question I kept asking in private rooms:\n\nWhat does the region actually think?\n\nNot what people say in public. Not what people post for approval. Not what leaders claim. Not what outsiders assume.\n\nWhat people actually think.\n\nThe Tribunal does not speak for the region. It records what people say when they can answer honestly.",
    quote: "\"People do not lack opinions. They lack a place to say them honestly.\"",
    author: "Kareem Kaddoura, Founder",
  },
  finalCta: {
    heading: "See where you stand.",
    subcopy: "Vote privately. See the result publicly.",
    primaryLabel: "Cast Your Vote",
    primaryHref: "/debates",
    secondaryLabel: "Make a Prediction",
    secondaryHref: "/predictions",
  },
}

export default function About() {
  usePageTitle({
    title: "About",
    description: "The Tribunal is a private voting platform for the Middle East and North Africa. People vote privately. Results are shown publicly.",
  });
  const { t, isAr } = useI18n()
  const { data: pageConfig } = usePageConfig<AboutConfig>("about")
  const { data: siteSettings } = useSiteSettings()
  const voicesEnabled = siteSettings?.featureToggles?.voices?.enabled ?? false
  const majlisEnabled = siteSettings?.featureToggles?.majlis?.enabled ?? false
  const pulseEnabled = siteSettings?.featureToggles?.pulse?.enabled ?? false

  // Merge CMS overrides over the defaults, section by section.
  const hero = { ...ABOUT_DEFAULTS.hero, ...pageConfig?.hero }
  const whatIsIt = { ...ABOUT_DEFAULTS.whatIsIt, ...pageConfig?.whatIsIt }
  const sharpestRead = { ...ABOUT_DEFAULTS.sharpestRead, ...pageConfig?.sharpestRead }
  const howItWorks = { ...ABOUT_DEFAULTS.howItWorks, ...pageConfig?.howItWorks }
  const founder = { ...ABOUT_DEFAULTS.founderStatement, ...pageConfig?.founderStatement }
  const finalCta = { ...ABOUT_DEFAULTS.finalCta, ...pageConfig?.finalCta }

  const negations = whatIsIt.negations?.length ? whatIsIt.negations : ABOUT_DEFAULTS.whatIsIt.negations
  const readParagraphs = (sharpestRead.paragraphs || "").split("\n\n").filter(Boolean)
  const stats = sharpestRead.stats?.length ? sharpestRead.stats : ABOUT_DEFAULTS.sharpestRead.stats
  const steps = howItWorks.steps?.length ? howItWorks.steps : ABOUT_DEFAULTS.howItWorks.steps
  const whatBody = (whatIsIt.body || "").split("\n\n").filter(Boolean)
  const founderParas = (founder.text || "").split("\n\n").filter(Boolean)

  const pageSections = [
    { id: "what-is-the-tribunal", label: t("What Is It") },
    { id: "the-sharpest-read", label: t("The Sharpest Read") },
    { id: "how-it-works", label: t("How It Works") },
    { id: "from-the-founder", label: t("From the Founder") },
  ]

  return (
    <Layout>
      <PageIndex sections={pageSections} />

      {/* Hero */}
      <div className="bg-foreground text-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10">
          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.28em", color: "#DC143C", marginBottom: "0.5rem" }}>
            {t(hero.tagline)}
          </p>
          <h1 style={{ fontFamily: isAr ? "'IBM Plex Sans Arabic', sans-serif" : "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: "clamp(2rem, 5vw, 3.5rem)", textTransform: "uppercase", color: "hsl(var(--background))", letterSpacing: "-0.01em", lineHeight: 1.05, marginBottom: "0.5rem" }}>
            {t(hero.titleLine1)}<br />
            {t(hero.titleLine2)}<TitlePunctuation punctuations={pageConfig?.punctuations} />
          </h1>
          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "0.90rem", textTransform: "uppercase", letterSpacing: "0.18em" }}>
            {t(hero.subtitle)}
          </p>
          {hero.microcopy?.trim() && (
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.83rem", letterSpacing: "0.04em", opacity: 0.6, marginTop: "0.85rem" }}>
              {t(hero.microcopy)}
            </p>
          )}
        </div>
      </div>

      {/* What is The Tribunal? */}
      <div id="what-is-the-tribunal" className="max-w-3xl mx-auto px-4 py-20 border-b border-border scroll-mt-24">
        <h2 className="font-serif font-black uppercase text-2xl text-foreground mb-8 border-l-4 border-primary pl-4">
          {t(whatIsIt.heading)}
        </h2>
        <p className="text-xl font-sans leading-relaxed text-foreground mb-8">
          {t(whatIsIt.lead)}
        </p>
        {whatBody.map((para, i) => (
          <p key={i} className="text-base text-muted-foreground font-sans leading-relaxed mb-8">
            {t(para)}
          </p>
        ))}
        {negations.map((line, i) => (
          <p key={i} className="text-base text-muted-foreground font-sans leading-relaxed mb-2">
            {t(line)}
          </p>
        ))}
        {whatIsIt.note?.trim() && (
          <p className="text-sm font-serif italic text-foreground/70 leading-relaxed border-l-2 border-primary/60 pl-4 mb-6 mt-6">
            {t(whatIsIt.note)}
          </p>
        )}
        {whatIsIt.accountNote?.trim() && (
          <p className="text-sm font-sans text-muted-foreground leading-relaxed">
            {t(whatIsIt.accountNote)}
          </p>
        )}
      </div>

      {/* The Sharpest Read */}
      <div id="the-sharpest-read" className="bg-secondary/10 border-b border-border scroll-mt-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <h2 className="font-serif font-black uppercase text-3xl border-b-2 border-foreground pb-4 mb-8 text-foreground">
            {t(sharpestRead.heading)}
          </h2>
          <div className="max-w-3xl space-y-6 mb-12">
            {readParagraphs.map((para, i) => (
              <p key={i} className={`text-lg text-foreground font-sans leading-relaxed${i === 2 ? " font-bold" : ""}`}>
                {t(para)}
              </p>
            ))}
            {sharpestRead.regionLine?.trim() && (
              <p className="text-sm font-serif italic text-foreground/70 mt-6">
                {t(sharpestRead.regionLine)}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center bg-foreground text-background py-12 px-4">
            {stats.map((stat, i) => {
              const isNumeric = /[0-9]/.test(stat.value)
              return (
                <div key={i}>
                  <div className={`font-display font-black leading-none mb-2 ${isNumeric ? "text-4xl md:text-5xl" : "text-2xl md:text-3xl pt-2"}`}>
                    {isNumeric ? stat.value : t(stat.value)}
                  </div>
                  <div className="text-[12px] uppercase tracking-[0.2em] font-serif text-primary">{t(stat.label)}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* How The Tribunal Works */}
      <div id="how-it-works" className="py-20 bg-secondary/20 border-b border-border scroll-mt-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif font-black uppercase text-3xl border-b-2 border-foreground pb-4 mb-12 text-foreground">
            {t(howItWorks.heading)}
          </h2>
          <div className="grid md:grid-cols-2 gap-10">
            {steps.map(s => (
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

      {/* From the Founder */}
      <div id="from-the-founder" className="max-w-3xl mx-auto px-4 py-20 border-b border-border scroll-mt-24">
        <h2 className="font-serif font-black uppercase text-2xl text-foreground mb-8 border-l-4 border-primary pl-4">
          {t(founder.heading)}
        </h2>
        {founderParas.map((para, i) => (
          <p key={i} className={`text-${i === 0 ? 'xl' : 'base'} ${i === 0 ? 'text-foreground' : 'text-muted-foreground'} font-sans leading-relaxed mb-6`}>
            {t(para)}
          </p>
        ))}

        <blockquote className="font-display text-2xl md:text-3xl border-l-4 border-primary pl-6 py-4 my-12 text-foreground leading-snug">
          {t(founder.quote)}
        </blockquote>

        <p className="text-base font-sans leading-relaxed text-foreground font-bold">
          {t(founder.author ? `— ${founder.author}` : "— Kareem Kaddoura, Founder")}
        </p>
      </div>

      {/* Final CTA */}
      <div className="py-20 border-t border-border">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="font-serif font-black uppercase text-3xl text-foreground mb-4">
            {t(finalCta.heading)}
          </h2>
          <p className="text-base text-muted-foreground font-sans mb-12">
            {t(finalCta.subcopy)}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
            <Link
              href={finalCta.primaryHref || "/debates"}
              className="bg-foreground text-background px-8 py-3 font-bold uppercase tracking-widest text-xs hover:bg-primary transition-colors font-serif"
            >
              {t(finalCta.primaryLabel)}
            </Link>
            <Link
              href={finalCta.secondaryHref || "/predictions"}
              className="border border-foreground text-foreground px-8 py-3 font-bold uppercase tracking-widest text-xs hover:bg-foreground hover:text-background transition-colors font-serif"
            >
              {t(finalCta.secondaryLabel)}
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
                {t("Explore Voices")}
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
